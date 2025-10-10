// backend/src/services/timberStackService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';

import { 
    ITimberStack, 
    ITimberStackFilters,
    CreateTimberStackDto, 
    IUpdateTimberStackFullDto,
    UpdateTimberStackLocationDto, 
    ITimberStackListFilters,
    ITimberStackListItem,
    IPuulaaniFullDetails
} from '../types';

import * as getQueries from '../queries/timberStackQueries/getTimberStackQueries';
import * as createQueries from '../queries/timberStackQueries/createTimberStackQueries';
import * as updateQueries from '../queries/timberStackQueries/updateTimberStackQueries';
import * as deleteQueries from '../queries/timberStackQueries/deleteTimberStackQueries';

export const getAllTimberStacks = async (filters: ITimberStackFilters): Promise<ITimberStack[]> => {
    
    console.log('--- Service received filters:', filters);
    
    const queryText = `
        SELECT
            p.puulaani_id, p.asiakas_id, a.asiakkaan_nimi, a.kohteen_vari,
            p.pvm, p.nimi, p.auto_nro, p.lisatiedot, p.kok, p.jaljella,
            p.km, p.aktiivinen, p.valmis, p.sijainti_lat, p.sijainti_long, p.ajomaaraysnro
        FROM public.puulaani p
        LEFT JOIN public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
    `;
    
    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (filters.clientId) {
        console.log(`Applying CLIENT filter. Original value: '${filters.clientId}', Type: ${typeof filters.clientId}`);
        const clientIdAsInt = parseInt(filters.clientId, 10);
        
        if (!isNaN(clientIdAsInt)) {
            conditions.push(`p.asiakas_id = $${paramIndex++}`);
            queryParams.push(clientIdAsInt);
            console.log(`SUCCESS: Added clientId = ${clientIdAsInt} to query.`);
        } else {
            console.error(`ERROR: clientId '${filters.clientId}' could not be parsed to an integer.`);
        }
    }

    if (filters.status === 'active') {
        conditions.push(`p.valmis = FALSE`);
    }

    if (filters.vehicleId) {
        console.log(`Applying VEHICLE filter. Original value: '${filters.vehicleId}', Type: ${typeof filters.vehicleId}`);
        const vehicleIdAsInt = parseInt(filters.vehicleId, 10);

        if(!isNaN(vehicleIdAsInt)) {
            conditions.push(`EXISTS (
                SELECT 1 
                FROM public.autot pa 
                WHERE pa.puulaani_id = p.puulaani_id 
                AND pa.kalusto_id = $${paramIndex++}
            )`);
            queryParams.push(vehicleIdAsInt);
            console.log(`SUCCESS: Added vehicleId = ${vehicleIdAsInt} to query.`);
        } else {
             console.error(`ERROR: vehicleId '${filters.vehicleId}' could not be parsed to an integer.`);
        }
    }

    let finalQuery = queryText;
    if (conditions.length > 0) {
        finalQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    finalQuery += ` ORDER BY p.pvm DESC, p.puulaani_id DESC;`;

    console.log('--- EXECUTING FINAL QUERY ---');
    console.log('Query:', finalQuery);
    console.log('Params:', queryParams);
    
    try {
        const result = await pool.query(finalQuery, queryParams);
        console.log(`--- Query returned ${result.rowCount} rows ---`);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error("Database query failed in getAllTimberStacks:", { error });
        throw error;
    }
};

export const getTimberStackById = async (id: number): Promise<ITimberStack | null> => {
    const result = await pool.query(getQueries.SELECT_TIMBER_STACK_BY_ID, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

export const createTimberStack = async (data: CreateTimberStackDto): Promise<ITimberStack> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            clientId, date, name, auto_nro, additionalInfo, totalVolume,
            isActive, isCompleted, latitude, longitude, dispatchOrderNo, kilometers,
            selectedAutoIds, woodEntries
        } = data;
        
        const params = [
            clientId, new Date(date), name, auto_nro ?? null, additionalInfo ?? '',
            totalVolume, totalVolume, kilometers ?? 0,
            isActive ?? true, isCompleted ?? false,
            latitude, longitude, dispatchOrderNo ?? null
        ];
        
        const result = await client.query(createQueries.INSERT_TIMBER_STACK, params);
        
        const rows = camelcaseKeys(result.rows);
        const newStackId = rows[0]?.puulaaniId;

        if (!newStackId) {
            throw new Error('Failed to create main timber stack record, no ID returned.');
        }

        if (selectedAutoIds && selectedAutoIds.length > 0) {
            for (const kalustoId of selectedAutoIds) {
                await client.query(updateQueries.INSERT_AUTOT_FOR_PUULAANI, [newStackId, kalustoId]);
            }
        }

        if (woodEntries && woodEntries.length > 0) {
            for (const woodEntry of woodEntries) {
                const woodParams = [
                    newStackId, clientId,
                    woodEntry.woodTypeId, woodEntry.dropoffLocationId,
                    woodEntry.totalVolume, 0,
                    woodEntry.totalVolume,
                    false
                ];
                await client.query(updateQueries.INSERT_PUUTAVARALAJI_FOR_PUULAANI, woodParams);
            }
        }

        await client.query('COMMIT');

        const newStack = await getTimberStackById(newStackId);
        if (newStack) return newStack;
        
        throw new Error('Timber stack created but could not retrieve the new record.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("SERVICE ERROR: Failed to create timber stack with associations.", error);
        throw error;
    } finally {
        client.release();
    }
};

// --- getTimberStackFullDetails ---
// This function is also correct from our previous fixes.
export const getTimberStackFullDetails = async (id: number): Promise<IPuulaaniFullDetails | null> => {
    const client = await pool.connect();
    try {
        const puulaaniResult = await client.query('SELECT *, asiakas_id as "clientId" FROM public.puulaani WHERE puulaani_id = $1', [id]);
        
        if (puulaaniResult.rows.length === 0) {
            return null;
        }

        const [autotResult, puutavaratResult, relatedLoadsResult] = await Promise.all([
            client.query('SELECT kalusto_id FROM public.autot WHERE puulaani_id = $1', [id]),
            client.query(`
                SELECT pl.*, pt.puutavara as laji, pp.purkupaikka as purkupaikka_name
                FROM public.puutavaralaji pl
                JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
                LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
                WHERE pl.puulaani_id = $1 ORDER BY pt.puutavara;
            `, [id]),
            client.query(`
                 SELECT 
                    k.kuorma_id,
                    k.kulj_id, -- <<< ADD THIS
                    k.status,
                    kul.nimi AS kuljettajan_nimi, -- <<< ADD THIS
                    pt.puutavara AS puutavaralaji,
                    k.pvm,
                    pl.kuutiot,
                    k.m3 AS haettu,
                    pl.jaljella
                FROM public.kuorma k
                LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id -- <<< JOIN to get the name
                LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
                LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
                WHERE k.puulaani_id = $1 AND
                        k.is_active = TRUE
                ORDER BY k.pvm DESC;
            `, [id])
        ]);
                // --- DEBUGGING LINE ---
        console.log("[BACKEND DEBUG] Raw relatedLoadsResult from DB:", relatedLoadsResult.rows);

        if (puulaaniResult.rows.length === 0) {
            return null;
        }


        return {
            puulaani: camelcaseKeys(puulaaniResult.rows[0]),
            autot: autotResult.rows.map(r => r.kalusto_id), 
            timberEntries: camelcaseKeys(puutavaratResult.rows), 
            relatedLoads: camelcaseKeys(relatedLoadsResult.rows)
        };
    } catch (error) {
        console.error(`[Service Error] Failed to get full details for timber stack ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};



// --- THIS IS THE FULLY CORRECTED updateTimberStackFull FUNCTION ---
export const updateTimberStackFull = async (id: number, data: IUpdateTimberStackFullDto): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { puulaani, autot, puutavarat } = data;

        // Step 1: Update the main 'puulaani' table
        const totalVolume = puutavarat.reduce((sum, item) => sum + (Number(item.kuutiot) || 0), 0);
        const totalFetched = puutavarat.reduce((sum, item) => sum + (Number(item.haettu) || 0), 0);
        const remainingVolume = totalVolume - totalFetched;

        const puulaaniParams = [
            puulaani.asiakasId, new Date(puulaani.pvm), puulaani.nimi, puulaani.autoNro,
            puulaani.lisatiedot, totalVolume, remainingVolume, puulaani.km ?? 0,
            puulaani.aktiivinen, puulaani.valmis, puulaani.sijaintiLat,
            puulaani.sijaintiLong, puulaani.ajomaaraysnro, id
        ];
        await client.query(updateQueries.UPDATE_TIMBER_STACK_BY_ID, puulaaniParams);

        // Step 2: Update 'autot' (vehicle assignments)
        await client.query(updateQueries.DELETE_AUTOT_BY_PUULAANI_ID, [id]);
        if (autot && autot.length > 0) {
            for (const kalustoId of autot) {
                await client.query(updateQueries.INSERT_AUTOT_FOR_PUULAANI, [id, kalustoId]);
            }
        }

        // Step 3: A safer way to update 'puutavaralaji' (timber entries)
        const existingEntriesResult = await client.query('SELECT puutavara_id FROM public.puutavaralaji WHERE puulaani_id = $1', [id]);
        const existingEntryIds = existingEntriesResult.rows.map(r => r.puutavara_id);
        const submittedEntryIds = puutavarat.map(p => p.puutavara_id).filter(pid => pid && pid > 0);

        const entriesToDelete = existingEntryIds.filter(eid => !submittedEntryIds.includes(eid));
        if (entriesToDelete.length > 0) {
            const referencedResult = await client.query('SELECT 1 FROM public.kuorma WHERE puutavara_id = ANY($1::bigint[]) LIMIT 1', [entriesToDelete]);
            if (referencedResult && referencedResult.rowCount) {
                throw new Error('Cannot delete a timber entry that is already assigned to a load/trip.');
            }
            await client.query('DELETE FROM public.puutavaralaji WHERE puutavara_id = ANY($1::bigint[])', [entriesToDelete]);
        }

        // --- THIS IS THE FINAL FIX ---
        // Upsert logic that RESPECTS the 'valmis' property from the frontend payload.
        // --- DEBUGGING STEP ---
        for (const woodEntry of puutavarat) {
            console.log(`[DEBUG] Processing woodEntry from frontend:`, woodEntry);
            
            const isCompleted = woodEntry.valmis;
            console.log(`[DEBUG] Extracted 'isCompleted' value: ${isCompleted}, Type: ${typeof isCompleted}`);

            const isExisting = woodEntry.puutavara_id && woodEntry.puutavara_id > 0;

            if (isExisting) {
                const updateParams = [
                    woodEntry.puutavaranro, 
                    woodEntry.purkupaikka_id, 
                    woodEntry.kuutiot, 
                    woodEntry.haettu, 
                    (woodEntry.kuutiot - woodEntry.haettu), 
                    isCompleted, // This is parameter $6
                    woodEntry.puutavara_id
                ];
                console.log(`[DEBUG] Preparing to UPDATE with params:`, updateParams);

                await client.query(
                    `UPDATE public.puutavaralaji SET puutavara_nro = $1, purkupaikka_id = $2, kuutiot = $3, haettu = $4, jaljella = $5, valmis = $6 WHERE puutavara_id = $7`,
                    updateParams
                );
            } else {
                const insertParams = [
                    id, 
                    puulaani.asiakasId, 
                    woodEntry.puutavaranro, 
                    woodEntry.purkupaikka_id, 
                    woodEntry.kuutiot, 
                    woodEntry.haettu, 
                    (woodEntry.kuutiot - woodEntry.haettu), 
                    isCompleted // This is parameter $8
                ];
                console.log(`[DEBUG] Preparing to INSERT with params:`, insertParams);

                await client.query(
                    `INSERT INTO public.puutavaralaji (puulaani_id, asiakas_id, puutavara_nro, purkupaikka_id, kuutiot, haettu, jaljella, valmis) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    insertParams
                );
            }
        }

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error in updateTimberStackFull, transaction rolled back.", e);
        throw e;
    } finally {
        client.release();
    }
};

export const deleteTimberStack = async (id: number): Promise<{ puulaaniId: number; message: string } | null> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(deleteQueries.DELETE_VEHICLE_ASSOCIATIONS_BY_STACK_ID, [id]);
        await client.query(deleteQueries.DELETE_WOOD_ENTRIES_BY_STACK_ID, [id]);
        
        const result = await client.query(deleteQueries.DELETE_TIMBER_STACK_BY_ID, [id]);
        
        const rows = camelcaseKeys(result.rows);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        await client.query('COMMIT');
        
        return { puulaaniId: rows[0].puulaaniId, message: 'Timber stack and all associated data deleted successfully' };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`SERVICE ERROR: Failed to delete timber stack with ID ${id} and its associations.`, error);
        throw error;
    } finally {
        client.release();
    }
};

export const updateTimberStackLocation = async (id: number, data: UpdateTimberStackLocationDto) => {
    const { latitude, longitude } = data;
    const result = await pool.query(updateQueries.UPDATE_TIMBER_STACK_LOCATION, [latitude, longitude, id]);
    
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0];
};

export const getTimberStackList = async (filters: ITimberStackListFilters): Promise<ITimberStackListItem[]> => {
    
    const queryText = `
        SELECT
            p.puulaani_id,
            p.nimi,
            a.asiakkaan_nimi,
            p.pvm,
            p.kok,
            p.jaljella
        FROM public.puulaani p
        LEFT JOIN public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
    `;
    
    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (filters.status === 'active') {
        conditions.push(`p.valmis = FALSE`);
    } else if (filters.status === 'completed') {
        conditions.push(`p.valmis = TRUE`);
    }

    if (filters.clientId) {
        const clientIdAsInt = parseInt(filters.clientId, 10);
        if (!isNaN(clientIdAsInt)) {
            conditions.push(`p.asiakas_id = $${paramIndex++}`);
            queryParams.push(clientIdAsInt);
        }
    }

    if (filters.vehicleId) {
        const vehicleIdAsInt = parseInt(filters.vehicleId, 10);
        if (!isNaN(vehicleIdAsInt)) {
            conditions.push(`EXISTS (
                SELECT 1 FROM public.autot pa 
                WHERE pa.puulaani_id = p.puulaani_id AND pa.kalusto_id = $${paramIndex++}
            )`);
            queryParams.push(vehicleIdAsInt);
        }
    }
    
    if (filters.timberTypeId) {
        const timberTypeIdAsInt = parseInt(filters.timberTypeId, 10);
        if (!isNaN(timberTypeIdAsInt)) {
             conditions.push(`EXISTS (
                SELECT 1 FROM public.puutavaralaji pt 
                WHERE pt.puulaani_id = p.puulaani_id AND pt.puutavara_nro = $${paramIndex++}
            )`);
            queryParams.push(timberTypeIdAsInt);
        }
    }

    let finalQuery = queryText;
    if (conditions.length > 0) {
        finalQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    finalQuery += ` ORDER BY p.pvm DESC, p.puulaani_id DESC;`;
    
    try {
        const result = await pool.query(finalQuery, queryParams);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error("Database query failed in getTimberStackList:", error);
        throw error;
    }
};

export const getTimberTypesForStack = async (id: number): Promise<any[]> => {
    const query = `
        SELECT 
            ptl.puutavara_id, 
            ptl.kuutiot, 
            ptl.haettu, 
            ptl.jaljella,
            pt.puutavara AS timber_type_name
        FROM public.puutavaralaji ptl
        JOIN public.puutavarat pt ON ptl.puutavara_nro = pt.puutavara_nro
        WHERE ptl.puulaani_id = $1;
    `;
    try {
        const result = await pool.query(query, [id]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`Database query failed in getTimberTypesForStack for puulaani_id ${id}:`, error);
        throw error;
    }
};

export const getActiveTimberStacksByClient = async (clientId: number) => {
    console.log(`--- Fetching ACTIVE timber stacks for client ID: ${clientId} ---`);
    const query = `
        SELECT
            puulaani_id,
            nimi,
            pvm,
            jaljella
        FROM public.puulaani
        WHERE 
            asiakas_id = $1
            AND valmis = FALSE
            AND aktiivinen = TRUE
        ORDER BY pvm DESC, nimi ASC;
    `;
    try {
        const result = await pool.query(query, [clientId]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`Database query failed in getActiveTimberStacksByClient for client ${clientId}:`, error);
        throw error;
    }
};

export const getWoodEntriesByPuulaaniId = async (puulaaniId: number) => {
    const query = `
        SELECT DISTINCT ON (pl.puutavara_id)
            pl.puutavara_id,
            pl.puulaani_id,
            pl.asiakas_id,
            pl.puutavara_nro,
            pl.purkupaikka_id,
            pl.kuutiot,
            pl.haettu,
            pl.jaljella,
            pl.valmis,
            pt.puutavara AS puutavara_name,
            pp.purkupaikka AS purkupaikka_name
        FROM
            public.puutavaralaji pl
        LEFT JOIN
            public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN
            public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE
            pl.puulaani_id = $1;
    `;
    
    const result = await pool.query(query, [puulaaniId]);
    return camelcaseKeys(result.rows);
};