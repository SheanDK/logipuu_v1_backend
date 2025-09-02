// backend/src/services/timberStackService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys'; // <<<--- THIS IMPORT WAS MISSING

import { 
    ITimberStack, 
    ITimberStackFilters,
    CreateTimberStackDto, 
    IUpdateTimberStackFullDto,
    UpdateTimberStackLocationDto, 
    ITimberStackListFilters, // Import the filter type
    ITimberStackListItem     // Import the list item type
} from '../types';

import * as getQueries from '../queries/timberStackQueries/getTimberStackQueries';
import * as createQueries from '../queries/timberStackQueries/createTimberStackQueries';
import * as updateQueries from '../queries/timberStackQueries/updateTimberStackQueries';
import * as deleteQueries from '../queries/timberStackQueries/deleteTimberStackQueries';

export const getAllTimberStacks = async (filters: ITimberStackFilters): Promise<ITimberStack[]> => {
    
    // --- DEBUGGING STEP 1: Log the incoming filter object ---
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

    // --- DEBUGGING STEP 2: Check the clientId condition specifically ---
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

export const getTimberStackFullDetails = async (id: number) => {
    const [puulaaniResult, autotResult, puutavaratResult] = await Promise.all([
        pool.query(getQueries.SELECT_TIMBER_STACK_BY_ID, [id]),
        pool.query(getQueries.SELECT_AUTOT_BY_PUULAANI_ID, [id]),
        pool.query(getQueries.SELECT_PUUTAVARAT_BY_PUULAANI_ID, [id])
    ]);

    if (puulaaniResult.rows.length === 0) return null;

    return {
        puulaani: puulaaniResult.rows[0],
        autot: autotResult.rows,
        puutavarat: puutavaratResult.rows
    };
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
        
        // Manually convert the result keys to camelCase because we are using a direct client query
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

export const updateTimberStackFull = async (id: number, data: IUpdateTimberStackFullDto): Promise<void> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { puulaani, autot, puutavarat } = data;
        const totalVolume = puutavarat.reduce((sum, item) => sum + item.kuutiot, 0);
        const totalFetched = puutavarat.reduce((sum, item) => sum + item.haettu, 0);
        const remainingVolume = totalVolume - totalFetched;

        const puulaaniParams = [
            puulaani.asiakasId, new Date(puulaani.pvm), puulaani.nimi, puulaani.autoNro,
            puulaani.lisatiedot, totalVolume, remainingVolume, puulaani.km ?? 0,
            puulaani.aktiivinen, puulaani.valmis, puulaani.sijaintiLat,
            puulaani.sijaintiLong, puulaani.ajomaaraysnro, id
        ];
        await client.query(updateQueries.UPDATE_TIMBER_STACK_BY_ID, puulaaniParams);

        await client.query(updateQueries.DELETE_AUTOT_BY_PUULAANI_ID, [id]);
        if (autot && autot.length > 0) {
            for (const kalustoId of autot) {
                await client.query(updateQueries.INSERT_AUTOT_FOR_PUULAANI, [id, kalustoId]);
            }
        }

        await client.query(updateQueries.DELETE_PUUTAVARALAJI_BY_PUULAANI_ID, [id]);
        if (puutavarat && puutavarat.length > 0) {
            for (const woodEntry of puutavarat) {
                const woodParams = [
                    id, 
                    puulaani.asiakasId, 
                    woodEntry.puutavaranro,
                    woodEntry.purkupaikka_id, 
                    woodEntry.kuutiot, 
                    woodEntry.haettu,
                    woodEntry.kuutiot - woodEntry.haettu,
                    (woodEntry.kuutiot - woodEntry.haettu) <= 0
                ];
                await client.query(updateQueries.INSERT_PUUTAVARALAJI_FOR_PUULAANI, woodParams);
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
        return null; // Indicates that the stack was not found
    }
    return result.rows[0];
};


// --- THIS IS THE FUNCTION FOR THE PUULAANI LIST VIEW ---
export const getTimberStackList = async (filters: ITimberStackListFilters): Promise<ITimberStackListItem[]> => {
    
    // Base query that joins Puulaani with Customers
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

    // Apply status filter
    if (filters.status === 'active') {
        conditions.push(`p.valmis = FALSE`);
    } else if (filters.status === 'completed') {
        conditions.push(`p.valmis = TRUE`);
    }
    // if 'all', no condition is added.

    // Apply customer (clientId) filter
    if (filters.clientId) {
        const clientIdAsInt = parseInt(filters.clientId, 10);
        if (!isNaN(clientIdAsInt)) {
            conditions.push(`p.asiakas_id = $${paramIndex++}`);
            queryParams.push(clientIdAsInt);
        }
    }

    // Apply vehicle (vehicleId) filter
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
    
    // Apply timber type (timberTypeId) filter
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
    // Order by most recent date, then by ID
    finalQuery += ` ORDER BY p.pvm DESC, p.puulaani_id DESC;`;
    
    try {
        const result = await pool.query(finalQuery, queryParams);
        // Convert snake_case from DB to camelCase for the frontend response
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error("Database query failed in getTimberStackList:", error);
        throw error;
    }
};

export const getTimberTypesForStack = async (id: number): Promise<any[]> => {
    // This query should join 'puutavaralaji' with 'puutavarat' to get the names
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
            AND valmis = FALSE -- 'valmis = false' means it's not completed
            AND aktiivinen = TRUE -- Ensures it is marked as active
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
    // --- THIS IS THE FIX ---
    // The DISTINCT ON (pl.puutavara_id) ensures that we only get one row
    // for each unique puutavara_id, preventing duplicates from JOINs.
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