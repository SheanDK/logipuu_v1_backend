// backend/src/services/loadService.ts

import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { ILoad, ILoadDetails, ILoadListItem, IMapTrip, ITripDetails } from '../types/load.types';
import { CreateLoadDto, UpdateLoadDto, CompleteLoadDto, CreateBulkLoadDto } from '../dto/load.dto';
import { UserPayload } from '../middlewares/authMiddleware';
import { socketService } from './socketService'; 

export interface ILoadListFilters {
    asiakasId?: string;
    kalustoNro?: string;
    kuljId?: string;
    status?: 'active' | 'pending_inspection' | 'all';
    loadType?: number; 
}
// Helper function to recalculate totals for a given puulaani_id
const recalculatePuulaaniTotals = async (client: any, puulaaniId: number) => {
    if (!puulaaniId) return;

    console.log(`Recalculating ALL totals for parent puulaani ID: ${puulaaniId}...`);
    
    const recalculateQuery = `
        WITH ptl_hauled_sum AS (
            SELECT puutavara_id, COALESCE(SUM(m3), 0) AS new_hauled_total
            FROM public.kuorma
            WHERE puulaani_id = $1 AND is_active = TRUE AND puutavara_id IS NOT NULL
            GROUP BY puutavara_id
        ),
        updated_ptl AS (
            UPDATE public.puutavaralaji ptl
            SET haettu = COALESCE(phs.new_hauled_total, 0), jaljella = ptl.kuutiot - COALESCE(phs.new_hauled_total, 0)
            FROM ptl_hauled_sum phs
            WHERE ptl.puulaani_id = $1 AND ptl.puutavara_id = phs.puutavara_id
            RETURNING ptl.puulaani_id
        ),
        puulaani_summary AS (
            SELECT COALESCE(SUM(kuutiot), 0) as total_volume, COALESCE(SUM(haettu), 0) as total_hauled
            FROM public.puutavaralaji
            WHERE puulaani_id = $1
        )
        UPDATE public.puulaani p
        SET kok = ps.total_volume, jaljella = (ps.total_volume - ps.total_hauled)
        FROM puulaani_summary ps
        WHERE p.puulaani_id = $1;
    `;
    await client.query(recalculateQuery, [puulaaniId]);
};

export const getAllLoadsForList = async (filters: ILoadListFilters): Promise<ILoadListItem[]> => {
    let queryText = `
        SELECT
            k.kuorma_id, 
            k.pvm, -- Return RAW DATE
            k.ajomaarays_nro,
            k.vastaanotto_nro, kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            p.nimi AS puulaani_nimi, a.asiakkaan_nimi, pt.puutavara AS timber_type,
            k.reitti, k.m3, k.km, k.tunnit, k.kpl, k.lisatiedot, k.status, k.is_active, k.tyyppi,
            p.sijainti_lat as origin_lat, p.sijainti_long as origin_lng,
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as waybill_count
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
    `;
    const conditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

     if (filters.loadType !== undefined) {
        conditions.push(`k.tyyppi = $${paramIndex++}`);
        queryParams.push(filters.loadType);
    }

    if (filters.status === 'active') {
        conditions.push(`k.status != 'Completed'`);
        conditions.push(`k.is_active = TRUE`);
    } else if (filters.status === 'pending_inspection') { 
        conditions.push(`k.status = 'Completed'`);
        conditions.push(`k.laskutukseen = 0`);
        conditions.push(`k.is_active = TRUE`);
    } else if (filters.status !== 'all') {
        conditions.push(`k.is_active = TRUE`);
    }

    if (filters.asiakasId) { conditions.push(`k.asiakas_id = $${paramIndex++}`); queryParams.push(parseInt(filters.asiakasId, 10)); }
    if (filters.kalustoNro) { conditions.push(`k.kalusto_nro = $${paramIndex++}`); queryParams.push(parseInt(filters.kalustoNro, 10)); }
    if (filters.kuljId) { conditions.push(`k.kulj_id = $${paramIndex++}`); queryParams.push(parseInt(filters.kuljId, 10)); }
    
    if (conditions.length > 0) { queryText += ` WHERE ${conditions.join(' AND ')}`; }
    queryText += ` ORDER BY k.pvm DESC, k.kuorma_id DESC;`;
    
    try {
        const result = await pool.query(queryText, queryParams);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error("Error fetching filtered loads:", error);
        throw new Error("Database query for fetching filtered loads failed.");
    }
};


export const getLoadById = async (id: number): Promise<ILoadDetails | null> => {
    // Basic fetch for single load details (used in some edits)
    const query = `
        SELECT k.*, a.asiakkaan_nimi, kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            p.nimi AS origin_name, p.osoite AS origin_address, p.sijainti_lat AS origin_lat,
            p.sijainti_long AS origin_lng, p.lisatiedot AS origin_instructions,
            pt.puutavara AS task_timber_type_name, pl.jaljella AS task_remaining_volume_before_this_trip,
            pp.purkupaikka AS destination_name, pp.osoite AS destination_address,
            pp.sijainti_lat AS destination_lat, pp.sijainti_long AS destination_lng
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE k.kuorma_id = $1;
    `;
    try {
        const result = await pool.query(query, [id]);
        if (result.rowCount === 0) return null;
        const row = camelcaseKeys(result.rows[0]);
        return { ...row, taskVolume: row.m3 };
    } catch (error) {
        console.error(`Error fetching detailed load with ID ${id}:`, error);
        throw new Error(`Database query for fetching detailed load with ID ${id} failed.`);
    }
};

// IMPORTANT: This is the function called by your controller based on the logs.
export const getTripByLoadId = async (id: number): Promise<any> => {
    
    // 1. Check Load Type
    const typeCheckQuery = `SELECT tyyppi FROM public.kuorma WHERE kuorma_id = $1`;
    const typeCheckResult = await pool.query(typeCheckQuery, [id]);

    if (typeCheckResult.rowCount === 0) {
        console.error(`[getTripByLoadId] Load with ID ${id} not found.`);
        return null; 
    }

    const loadType = typeCheckResult.rows[0].tyyppi;

    // =========================================================
    // CASE A: CONSIGNMENT (Rahtikirja) - tyyppi = 1
    // =========================================================
    if (loadType === 1) {
        console.log(`[getTripByLoadId] Fetching Consignment details for ID ${id}`);
        
        const loadQuery = `
            SELECT 
                k.kuorma_id as "kuormaId",
                k.pvm,
                k.status,
                k.lisatiedot,
                k.m3, k.km, k.kpl, k.tunnit, 
                k.tyyppi,
                k.kulj_id,
                k.kalusto_nro,
                k.asiakas_id,
                
                -- Joins for Names
                a.asiakkaan_nimi as "asiakkaanNimi",
                kal.rek_nro as "rekNro",
                kul.nimi as "kuljettajanNimi"
            FROM public.kuorma k
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
            WHERE k.kuorma_id = $1
        `;
        const loadResult = await pool.query(loadQuery, [id]);
        const loadData = loadResult.rows[0];

        // Fetch Waybills with Customer Names
        const waybillsQuery = `
            SELECT 
                r.rahti_id as "rahtiId",
                r.asiakas_id as "asiakasId",
                a.asiakkaan_nimi as "customerName", -- Joined name
                r.rahtikirjan_nro as "rahtikirjanNro",
                r.reitti,
                r.m3, 
                r.km, 
                r.kpl, 
                r.jako, 
                r.tievero, 
                r.lisatiedot
            FROM public.rahtikirja r
            LEFT JOIN public.asiakkaat a ON r.asiakas_id = a.asiakkaan_id
            WHERE r.kuorma_id = $1
            ORDER BY r.rahti_id ASC
        `;
        const waybillsResult = await pool.query(waybillsQuery, [id]);

        loadData.rahtikirjat = waybillsResult.rows;

        return camelcaseKeys(loadData);
    }

    // =========================================================
    // CASE B: TIMBER LOAD (Puukuorma) - tyyppi = 0
    // =========================================================
    else {
        console.log(`[getTripByLoadId] Fetching Timber Trip details for ID ${id}`);

        const initialLoadQuery = 'SELECT ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro FROM public.kuorma WHERE kuorma_id = $1';
        const initialLoadResult = await pool.query(initialLoadQuery, [id]);
        
        const { ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro } = initialLoadResult.rows[0];
        const drivingOrderNumber = ajomaarays_nro;

        // Fetch details for the specific row (for completed trip view)
        // Or fetch all legs if needed. For detail view, we fetch the specific load details.
        const tripLegsQuery = `
            SELECT
                k.kuorma_id as "kuormaId", 
                k.pvm, 
                k.status, 
                k.m3, k.km, 
                k.tunnit, 
                k.kpl, 
                k.reitti, 
                k.vastaanotto_nro as "vastaanottoNro", -- EXPLICIT ALIAS
                k.ajomaarays_nro as "ajomaaraysNro",   -- EXPLICIT ALIAS
                k.kulj_id, 
                k.lisatiedot,
                k.puulaani_id, 
                k.puutavara_id, 
                k.kalusto_nro,
                
                COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
                COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
                
                a.asiakkaan_nimi as "asiakkaanNimi",
                kal.rek_nro as "rekNro",
                kul.nimi as "kuljettajanNimi",
                
                'Timber Load' as tyyppi
            FROM public.kuorma k
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
            LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
            LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
            LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
            WHERE k.kuorma_id = $1
        `;
        const tripLegsResult = await pool.query(tripLegsQuery, [id]);
        
        if (tripLegsResult.rowCount === 0) return null;

        const row = tripLegsResult.rows[0];

        // Construct Trip Details Object
        const tripDetails = {
            tripId: ajomaarays_nro || `Trip #${id}`,
            ajomaaraysNro: row.ajomaaraysNro,
            vastaanottoNro: row.vastaanottoNro,
            asiakasId: asiakas_id,
            asiakkaanNimi: row.asiakkaanNimi,
            rekNro: row.rekNro,
            kalustoNro: kalusto_nro,
            kuljettajanNimi: row.kuljettajanNimi,
            lahto: row.lahto,
            kohde: row.kohde,
            m3: row.m3,
            km: row.km,
            tunnit: row.tunnit,
            kpl: row.kpl,
            tyyppi: row.tyyppi,
            pvm: row.pvm,
            lisatiedot: row.lisatiedot,
            legs: []
        };

        return tripDetails; // No need for camelcaseKeys if we use aliases correctly
    }
};


export const createLoad = async (data: CreateLoadDto): Promise<ILoad> => {
    const { 
        tyyppi, asiakasId, puulaaniId, kalustoNro, kuljId, pvm, 
        ajomaaraysNro, kohde, lahto, m3, km, lisatiedot, puutavaraId, vastaanottoNro 
    } = data;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let autoId: number | null = null;
        if (puulaaniId && kalustoNro) {
            const autoResult = await client.query('SELECT auto_id FROM public.autot WHERE puulaani_id = $1 AND kalusto_id = $2 LIMIT 1', [puulaaniId, kalustoNro]);
            if (autoResult && (autoResult.rowCount ?? 0) > 0) { autoId = autoResult.rows[0].auto_id; }
        }
        
        const insertQuery = `
            INSERT INTO public.kuorma 
            (tyyppi, asiakas_id, puulaani_id, puutavara_id, auto_id, kulj_id, pvm, ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, status, vastaanotto_nro) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Assigned', $15) 
            RETURNING *;
        `;
        const params = [tyyppi, asiakasId, puulaaniId ?? null, puutavaraId ?? null, autoId, kuljId, pvm, ajomaaraysNro ?? null, kohde ?? null, lahto ?? null, m3 ?? 0, km ?? 0, lisatiedot ?? null, kalustoNro, vastaanottoNro ?? null];
        const result = await client.query(insertQuery, params);
        const newLoad = result.rows[0];

        if (puutavaraId && m3 && m3 > 0) {
            await client.query(`UPDATE public.puutavaralaji SET haettu = haettu + $1, jaljella = jaljella - $1 WHERE puutavara_id = $2;`, [m3, puutavaraId]);
        }
        if (newLoad.puulaani_id) {
            await recalculatePuulaaniTotals(client, newLoad.puulaani_id);
        }
        await client.query('COMMIT');
        return camelcaseKeys(newLoad);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("!!! DATABASE ERROR while creating new load:", error);
        throw new Error("Database query for creating a new load failed.");
    } finally {
        client.release();
    }
};



// --- THIS IS THE UPDATED, SECURE updateLoad FUNCTION ---
export const updateLoad = async (id: number, data: UpdateLoadDto, user: UserPayload): Promise<ILoad> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Step 1: Lock the target row and get its current state.
        const { rows, rowCount } = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
        if (rowCount === 0) {
            throw new Error(`Load with ID ${id} not found.`);
        }
        const existingLoad = rows[0];
        const isDriver = user.roles.includes('Kuljettaja');

        // --- AUTHORIZATION & STATUS CHECKS ---

        if (isDriver) {
            // Driver Check 1: Must own the load
            if (existingLoad.kulj_id !== user.driverNumericId) {
                throw new Error('You are not authorized to edit this load.');
            }
            
            // Driver Check 2: Cannot edit if Completed
            if (existingLoad.status === 'Completed') {
                 throw new Error('Cannot edit a completed load.');
            }
            
            // Driver Check 3: Can only edit 'Assigned' loads (loads that haven't started moving)
            // If you want drivers to edit Active loads, remove this check.
            if (existingLoad.status !== 'Assigned') {
                throw new Error('This load is already in progress and cannot be edited.');
            }

        } else {
            // Office User Check: Cannot edit if already invoiced (laskutukseen = 1)
            // They CAN edit 'Completed' loads as long as they are pending inspection (laskutukseen = 0)
            if (existingLoad.status === 'Completed' && existingLoad.laskutukseen === 1) {
                throw new Error('Cannot edit a load that has already been accepted for invoicing.');
            }
        }

        // =========================================================
        // SCENARIO 1: CONSIGNMENT UPDATE (tyyppi = 1)
        // =========================================================
        if (existingLoad.tyyppi === 1) {
            console.log(`[updateLoad] Updating Consignment ID: ${id}`);

            // 1. Update Parent Load (Kuorma)
            // Aggregates (m3, km, kpl) should be calculated in frontend and passed here
            const updateKuormaQuery = `
                UPDATE public.kuorma 
                SET pvm = $1, lisatiedot = $2, m3 = $3, km = $4, kpl = $5, tunnit = $6,  asiakas_id = $7
                WHERE kuorma_id = $8
                RETURNING *;
            `;
            const kuormaParams = [
                data.pvm, 
                data.lisatiedot, 
                Number(data.m3) || 0, 
                Number(data.km) || 0, 
                Number(data.kpl) || 0, 
                Number(data.tunnit) || 0, 
                data.asiakasId || null,
                id
            ];
            const kuormaResult = await client.query(updateKuormaQuery, kuormaParams);
            const updatedLoad = kuormaResult.rows[0];

            // 2. Update Waybills (Rahtikirja)
            // Strategy: Delete All existing for this load and Insert New ones from payload
            // This handles adds, edits, and deletes in one go.
            if (data.rahtikirjat && Array.isArray(data.rahtikirjat)) {
                await client.query('DELETE FROM public.rahtikirja WHERE kuorma_id = $1', [id]);

                for (const wb of data.rahtikirjat) {
                    const insertWbQuery = `
                        INSERT INTO public.rahtikirja (
                            kuorma_id, pvm, asiakas_id, rahtikirjan_nro, reitti, 
                            m3, km, kpl, jako, tievero, lisatiedot
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
                    `;
                    const wbParams = [
                        id, 
                        data.pvm, // Waybills inherit date from parent
                        wb.asiakasId || null, 
                        wb.rahtikirjanNumero || '',
                        wb.reitti || '',
                        Number(wb.m3) || 0, 
                        Number(wb.km) || 0, 
                        Number(wb.kpl) || 0, 
                        Number(wb.jako) || 0, 
                        Number(wb.tievero) || 0, 
                        wb.lisatiedot || ''
                    ];
                    await client.query(insertWbQuery, wbParams);
                }
            }

            await client.query('COMMIT');
            return camelcaseKeys(updatedLoad) as ILoad;
        }

        // =========================================================
        // SCENARIO 2: TIMBER LOAD UPDATE (tyyppi = 0)
        // =========================================================
        else {
            // Step 3: Calculate volume change (m3 delta)
            const oldM3 = Number(existingLoad.m3) || 0;
            const newM3 = data.m3 !== undefined ? Number(data.m3) : oldM3;
            const m3Delta = newM3 - oldM3;

            // Step 4: Update timber entry if volume changed
            if (existingLoad.puutavara_id && m3Delta !== 0) {
                const updateTimberEntryQuery = `
                    UPDATE public.puutavaralaji
                    SET haettu = haettu + $1, jaljella = jaljella - $1
                    WHERE puutavara_id = $2;
                `;
                await client.query(updateTimberEntryQuery, [m3Delta, existingLoad.puutavara_id]);
            }
            
            // Step 5: Construct update query
            let fieldsToUpdate: Partial<any>;

            if (isDriver) {
                fieldsToUpdate = {
                    vastaanotto_nro: data.vastaanottoNro,
                    m3: data.m3,
                    km: data.km,
                    reitti: data.reitti,
                    lisatiedot: data.lisatiedot
                };
            } else {
                // Office users fields
                fieldsToUpdate = {
                    tyyppi: data.tyyppi,
                    asiakas_id: data.asiakasId,
                    puulaani_id: data.puulaaniId,
                    puutavara_id: data.puutavaraId,
                    kalusto_nro: data.kalustoNro,
                    kulj_id: data.kuljId,
                    pvm: data.pvm,
                    ajomaarays_nro: data.ajomaaraysNro,
                    vastaanotto_nro: data.vastaanottoNro,
                    kohde: data.kohde,
                    lahto: data.lahto,
                    reitti: data.reitti,
                    m3: data.m3,
                    km: data.km,
                    tunnit: data.tunnit,
                    kpl: data.kpl,
                    lisatiedot: data.lisatiedot
                };
            }

            const updates: { [key: string]: any } = {};
            for (const [key, value] of Object.entries(fieldsToUpdate)) {
                if (value !== undefined) {
                    updates[key] = value;
                }
            }
            
            let updatedLoadRow;
            if (Object.keys(updates).length > 0) {
                const setClauses = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
                const params = [...Object.values(updates), id];
                const updateQuery = `UPDATE public.kuorma SET ${setClauses} WHERE kuorma_id = $${params.length} RETURNING *;`;
                
                const result = await client.query(updateQuery, params);
                updatedLoadRow = result.rows[0];
            } else {
                updatedLoadRow = existingLoad;
            }

            // Step 6: Recalculate totals
            if (updatedLoadRow.puulaani_id) {
                await recalculatePuulaaniTotals(client, updatedLoadRow.puulaani_id);
            }
            
            await client.query('COMMIT');
            return camelcaseKeys(updatedLoadRow) as ILoad;
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error in updateLoad transaction for ID ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

export const deleteLoad = async (id: number, user: UserPayload): Promise<{ kuormaId: number; message: string } | null> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Step 1: Get the full load details to perform checks and get necessary IDs.
        // Lock the row for the transaction.
        const loadResult = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
        if (loadResult.rowCount === 0) {
            return null; // Not found
        }
        const existingLoad = loadResult.rows[0];
        
        // --- Authorization Checks ---
        const isDriver = user.roles.includes('Kuljettaja');
        if (isDriver) {
            if (existingLoad.kulj_id !== user.driverNumericId) {
                throw new Error('Forbidden: You are not authorized to delete this load.');
            }
            if (existingLoad.status === 'Completed') {
                 throw new Error('Cannot delete a completed load.');
            }
        }

        // --- THE FIX IS HERE ---
        // Step 2: Revert the 'haettu' (hauled) value in the corresponding timber log.
        const m3ToRevert = Number(existingLoad.m3) || 0;
        if (existingLoad.puutavara_id && m3ToRevert > 0) {
             console.log(`Reverting ${m3ToRevert} m³ from timber entry ID: ${existingLoad.puutavara_id}...`);
             const updateTimberEntryQuery = `
                UPDATE public.puutavaralaji
                SET 
                    haettu = haettu - $1, 
                    jaljella = jaljella + $1
                WHERE puutavara_id = $2;
            `;
            await client.query(updateTimberEntryQuery, [m3ToRevert, existingLoad.puutavara_id]);
        }

        // Step 3: Soft-delete the load itself.
        const softDeleteQuery = 'UPDATE public.kuorma SET is_active = FALSE WHERE kuorma_id = $1 RETURNING kuorma_id;';
        const result = await client.query(softDeleteQuery, [id]);

        // Step 4: Recalculate the grand totals for the parent puulaani.
        if (existingLoad.puulaani_id) {
            await recalculatePuulaaniTotals(client, existingLoad.puulaani_id);
        }

        await client.query('COMMIT');
        
        console.log(`Successfully soft-deleted load with ID: ${id} and updated totals.`);
        return { 
            kuormaId: result.rows[0].kuorma_id, 
            message: 'Load marked as inactive and totals updated successfully' 
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error during soft delete for load ID ${id}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

export const updateLoadStatus = async (id: number, status: string, driverId: number): Promise<ILoad> => {
    const updateQuery = `UPDATE public.kuorma SET status = $1 WHERE kuorma_id = $2 AND kulj_id = $3 RETURNING *;`;
    try {
        const result = await pool.query(updateQuery, [status, id, driverId]);
        if (result.rowCount === 0) {
            throw new Error('Load not found or you are not authorized to update it.');
        }
        const updatedLoad = camelcaseKeys(result.rows[0]);

        // --- Emit socket event ---
        socketService.emit('loadStatusUpdated', updatedLoad);

        return updatedLoad;
    } catch (error) {
        console.error(`Error during status update for load ID ${id}:`, error);
        throw error;
    }
};

// --- THIS IS THE NEW FUNCTION FOR THE DRIVER'S PORTAL ---
export const getMyLoadsForList = async (driverId: number): Promise<ILoadListItem[]> => {
    // This query now handles grouping in a way that is fully compatible with PostgreSQL.
    const queryText = `
        SELECT
            -- Use the driving order number as the main identifier for the group.
            k.ajomaarays_nro,
            
            -- Aggregate functions for all other columns
            MIN(k.kuorma_id) AS kuorma_id,
            SUM(k.m3) AS m3,
            STRING_AGG(DISTINCT COALESCE(p.nimi, k.lahto, 'N/A'), ' -> ') AS lahto,
            STRING_AGG(DISTINCT COALESCE(pp.purkupaikka, k.kohde, 'N/A'), ' -> ') AS kohde,
            (array_agg(a.asiakkaan_nimi ORDER BY k.kuorma_id ASC))[1] AS asiakkaan_nimi,
            (array_agg(k.status ORDER BY k.kuorma_id ASC))[1] AS status,
            (array_agg(kal.rek_nro ORDER BY k.kuorma_id ASC))[1] AS rek_nro,
            (array_agg(k.pvm ORDER BY k.kuorma_id ASC))[1] AS pvm,
            (array_agg(p.sijainti_lat ORDER BY k.kuorma_id ASC))[1] as origin_lat,
            (array_agg(p.sijainti_long ORDER BY k.kuorma_id ASC))[1] as origin_lng
            
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.is_active = TRUE 
            AND k.kulj_id = $1
            AND k.status NOT IN ('Completed', 'Cancelled')
        
        -- Group by the driving order number. All other columns must be aggregated.
        GROUP BY 
            k.ajomaarays_nro
        
        ORDER BY 
            pvm ASC, kuorma_id ASC;
    `;
    try {
        const result = await pool.query(queryText, [driverId]);
        
        // After fetching, manually create the trip identifier for the frontend if ajomaarays_nro is null
        const processedRows = result.rows.map(row => {
            const finalRow = { ...row };
            if (!finalRow.ajomaarays_nro) {
                finalRow.ajomaarays_nro = `Trip #${finalRow.kuorma_id}`;
            }
            return camelcaseKeys(finalRow);
        });

        
        return processedRows;

    } catch (error) {
        console.error(`[Service Error] Failed to fetch active trips for driver ID ${driverId}. Query failed.`, error);
        throw new Error("Database query for fetching driver's active trips failed.");
    }
};



// --- THIS IS THE NEW FUNCTION FOR COMPLETING A LOAD ---
export const completeLoad = async (loadId: number, driverId: number, data: CompleteLoadDto): Promise<ILoad> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start a database transaction

        // Step 1: Fetch the load and ensure it's valid for completion
        const loadResult = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [loadId]);
        if (loadResult.rowCount === 0) {
            throw new Error('Load not found.');
        }
        const load = loadResult.rows[0];
        if (load.kulj_id !== driverId) {
            throw new Error('You are not authorized to complete this load.');
        }
        if (load.status !== 'At Destination') {
            throw new Error(`Load cannot be completed from its current status: ${load.status}`);
        }

        // Step 2: Update the kuorma table with actuals and set status to 'Completed'
        const updateLoadQuery = `
            UPDATE public.kuorma 
            SET 
                status = 'Completed',
                actual_m3 = $1,
                actual_km = $2,
                completion_timestamp = NOW()
            WHERE kuorma_id = $3
            RETURNING *;
        `;
        const updatedLoadResult = await client.query(updateLoadQuery, [data.actualM3, data.actualKm, loadId]);

        // Step 3: Update the puutavaralaji table (the timber task)
        if (load.puutavara_id) {
            const updateTaskQuery = `
                UPDATE public.puutavaralaji
                SET 
                    haettu = haettu + $1,
                    jaljella = jaljella - $1
                WHERE puutavara_id = $2;
            `;
            await client.query(updateTaskQuery, [data.actualM3, load.puutavara_id]);
        }
        
        // --- THIS IS THE FIX: Step 4: Update the parent puulaani's remaining volume ---
        if (load.puulaani_id) {
            const updatePuulaaniQuery = `
                UPDATE public.puulaani
                SET
                    jaljella = jaljella - $1
                WHERE puulaani_id = $2;
            `;
            await recalculatePuulaaniTotals(client, load.puulaani_id);
            await client.query(updatePuulaaniQuery, [data.actualM3, load.puulaani_id]);
        }
        
        await client.query('COMMIT'); // Commit all changes if successful
        console.log(`--- Load ${loadId} completed and ALL related tables updated ---`);
        return camelcaseKeys(updatedLoadResult.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK'); // Roll back all changes on any error
        console.error(`Error completing load ${loadId}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// --- THIS IS THE NEW FUNCTION FOR THE DRIVEN/INSPECTION PAGE ---
export const getLoadsForInspection = async (): Promise<ILoadListItem[]> => {
    console.log('--- Fetching loads for inspection (Completed but not invoiced) ---');
    
    const queryText = `
        SELECT
            k.kuorma_id,
            k.pvm, -- TO_CHAR ඉවත් කරන ලදී (Raw date එක එවීමට)
            k.ajomaarays_nro,
            k.vastaanotto_nro,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            a.asiakkaan_nimi,
            pt.puutavara AS timber_type,
            k.reitti,
            k.m3,
            k.km,
            k.tunnit,
            k.kpl,
            k.lisatiedot,
            k.status,
            k.is_active,
            k.puutavara_id,
            k.tyyppi,
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as waybill_count
        FROM
            public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.status = 'Completed' AND
            k.laskutukseen = 0 AND
            k.is_active = TRUE
        ORDER BY
            k.pvm ASC, k.kuorma_id ASC;
    `;
    
    try {
        const result = await pool.query(queryText);
        return camelcaseKeys(result.rows); 
    } catch (error) {
        console.error("Error fetching loads for inspection:", error);
        throw new Error("Database query for fetching inspection loads failed.");
    }
};
// --- NEW FUNCTION for accepting loads for invoicing ---
export const acceptLoadsForInvoicing = async (loadIds: number[]): Promise<{ count: number }> => {
    if (!loadIds || loadIds.length === 0) {
        return { count: 0 };
    }

    console.log(`--- Accepting ${loadIds.length} loads for invoicing ---`);

    // Using ANY($1) is an efficient way to update multiple rows based on an array of IDs in PostgreSQL
    const query = `
        UPDATE public.kuorma
        SET laskutukseen = 1 -- Set the flag to 'accepted'
        WHERE kuorma_id = ANY($1::bigint[]) AND status = 'Completed';
    `;

    try {
        const result = await pool.query(query, [loadIds]);
        console.log(`--- Successfully accepted ${result.rowCount} loads ---`);
        return { count: result.rowCount || 0 };
    } catch (error) {
        console.error("Error accepting loads for invoicing:", error);
        throw new Error("Database query for accepting loads failed.");
    }
};

// --- THIS IS THE NEW FUNCTION FOR FETCHING COMPLETED TRIPS ---
export const getMyCompletedLoadsForList = async (driverId: number): Promise<ILoadListItem[]> => {
    // This query combines results for Timber Loads (tyyppi = 0) and Consignments (tyyppi = 1)
    const queryText = `
        -- Query 1: Fetch completed Timber Loads (Puulaani)
        SELECT
            k.kuorma_id,
            k.pvm, -- Return Raw Date
            a.asiakkaan_nimi,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            COALESCE(k.m3, 0) as m3, -- Ensure m3 is not null
            0 as waybill_count,      -- Timber loads have 0 waybills
            k.status,                -- Return status
            'Timber Load' AS tyyppi
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.kulj_id = $1
            AND k.status = 'Completed'
            AND k.tyyppi = 0

        UNION ALL

        -- Query 2: Fetch completed Consignments (Rahtikirja)
        SELECT
            k.kuorma_id,
            k.pvm, -- Return Raw Date
            a.asiakkaan_nimi,
            k.lahto AS lahto,
            k.kohde AS kohde,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            COALESCE(k.m3, 0) as m3, -- Ensure m3 is not null
            (SELECT COUNT(*) FROM public.rahtikirja r WHERE r.kuorma_id = k.kuorma_id) as waybill_count,
            k.status, -- Return status
            'Consignment' AS tyyppi
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        WHERE 
            k.kulj_id = $1
            AND k.status = 'Completed'
            AND k.tyyppi = 1

        ORDER BY pvm DESC, kuorma_id DESC;
    `;
    
    try {
        const result = await pool.query(queryText, [driverId]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`Error fetching completed loads for driver ID ${driverId}:`, error);
        throw new Error("Database query for fetching driver's completed loads failed.");
    }
};

export const getMyLastCompletedLoad = async (driverId: number): Promise<ILoadListItem | null> => {
    let queryText = `
        SELECT
            k.kuorma_id,
            TO_CHAR(k.pvm, 'YYYY-MM-DD') AS pvm,
            a.asiakkaan_nimi,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            k.status
        FROM
            public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        WHERE 
            k.kulj_id = $1
            AND k.status = 'Completed'
        ORDER BY 
            k.completion_timestamp DESC, k.pvm DESC
        LIMIT 1;
    `;
    
    try {
        const result = await pool.query(queryText, [driverId]);
        return result.rows.length > 0 ? camelcaseKeys(result.rows[0]) : null;
    } catch (error) {
        console.error(`Error fetching last completed load for driver ID ${driverId}:`, error);
        throw error;
    }
};

export const getActiveTripsForMap = async (): Promise<IMapTrip[]> => {
    const query = `
        SELECT
            k.kuorma_id AS trip_id,
            kul.nimi AS driver_name,
            kal.rek_nro AS vehicle_reg_no,
            COALESCE(p.nimi, k.lahto) AS origin_name,
            COALESCE(pp.purkupaikka, k.kohde) AS destination_name,
            k.status,
            p.sijainti_lat AS origin_lat,
            p.sijainti_long AS origin_lng,
            pp.sijainti_lat AS destination_lat,
            pp.sijainti_long AS destination_lng
        FROM
            public.kuorma k
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        
        -- --- THIS IS THE FIX ---
        -- The column name in the 'kuorma' table is 'kulj_id', not 'kul_id'.
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        WHERE
            k.is_active = TRUE
            AND k.status != 'Completed'
            AND p.sijainti_lat IS NOT NULL 
            AND p.sijainti_long IS NOT NULL
            AND pp.sijainti_lat IS NOT NULL
            AND pp.sijainti_long IS NOT NULL;
    `;
    
    try {
        const result = await pool.query(query);
        const trips = result.rows.map(row => ({
            tripId: row.trip_id,
            driverName: row.driver_name,
            vehicleRegNo: row.vehicle_reg_no,
            originName: row.origin_name,
            destinationName: row.destination_name,
            status: row.status,
            originCoords: { lat: parseFloat(row.origin_lat), lng: parseFloat(row.origin_lng) },
            destinationCoords: { lat: parseFloat(row.destination_lat), lng: parseFloat(row.destination_lng) }
        }));
        return trips;
    } catch (error) {
        console.error("Error executing getActiveTripsForMap query:", error);
        throw new Error("Database query for fetching active trips failed.");
    }
};

// THIS IS THE NEW SERVICE FUNCTION WITH TRANSACTION LOGIC
export const updateTripByLoadId = async (initialLoadId: number, tripData: any, driverId: number): Promise<any> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Fetch essential info and validate ownership and status
        const initialLoadResult = await client.query('SELECT ajomaarays_nro, kulj_id, status FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [initialLoadId]);
        if (initialLoadResult.rowCount === 0) { throw new Error('Trip not found.'); }
        
        const { ajomaarays_nro, kulj_id, status } = initialLoadResult.rows[0];
        
        if (kulj_id !== driverId) { throw new Error('You are not authorized to edit this trip.'); }
        if (status !== 'Assigned') { throw new Error(`This trip is already in progress and cannot be edited. Status is: ${status}`); }

        // Step 2: Delete all existing legs associated with this driving order number for this driver
        // This is a safe way to handle additions, removals, and updates in one go.
        await client.query('DELETE FROM public.kuorma WHERE ajomaarays_nro = $1 AND kulj_id = $2', [ajomaarays_nro, driverId]);
        
        // Step 3: Re-insert all legs from the frontend payload
        const newLegs = tripData.legs;
        const insertPromises = newLegs.map((leg: any) => {
            const insertQuery = `
                INSERT INTO public.kuorma 
                (tyyppi, asiakas_id, puulaani_id, puutavara_id, kulj_id, pvm, ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, status, is_active) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'Assigned', TRUE)
            `;
            
            // THE CRITICAL FIX: Ensure `tripData.loadType` is included in the params for insertion.
            const params = [
                tripData.loadType, // <-- THIS WAS THE MISSING PIECE
                tripData.asiakasId, 
                leg.puulaaniId ?? null, 
                leg.puutavaraId ?? null, 
                driverId,
                tripData.pvm, 
                ajomaarays_nro, 
                leg.kohde ?? leg.lahto, // Use lahto as fallback for kohde
                leg.lahto ?? null,
                leg.m3 ?? 0, 
                leg.km ?? 0, 
                tripData.lisatiedot ?? null, 
                tripData.kalustoNro
            ];
            
            return client.query(insertQuery, params);
        });

        await Promise.all(insertPromises);
        
        await client.query('COMMIT');
        
        return { message: `Trip ${ajomaarays_nro} updated successfully.` };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error updating trip with initial load ID ${initialLoadId}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Creates multiple loads (legs) within a single database transaction.
 * FIX: This function now generates a unique 'ajomaaraysnro' (Driving Order Number)
 * and applies it to all legs, effectively grouping them into a single trip.
 */
export const createBulkLoad = async (data: CreateBulkLoadDto, user: UserPayload) => {
    const { legs } = data;
    if (!legs || legs.length === 0) {
        throw new Error("No load legs provided in the request.");
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let ajomaaraysNro = legs[0].ajomaaraysNro;
        if (!ajomaaraysNro) {
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
            ajomaaraysNro = `TRIP-${timestamp}-${user.driverNumericId}`;
        }

        const createdLoadIds: number[] = [];

        for (const leg of legs) {
            // --- FIX 1: Set initial status to 'In Progress' for automatic start ---
            const status = 'In Progress'; 

            const insertQuery = `
                INSERT INTO public.kuorma (
                    tyyppi, asiakas_id, puulaani_id, puutavara_id, kulj_id, pvm, 
                    ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, status, 
                    vastaanotto_nro, reitti, tunnit, kpl
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
                RETURNING kuorma_id;
            `;
            
            const params = [ 
                leg.tyyppi, leg.asiakasId, leg.puulaaniId ?? null, leg.puutavaraId ?? null,
                leg.kuljId, leg.pvm, 
                ajomaaraysNro,
                leg.kohde ?? null, leg.lahto ?? null, leg.m3 ?? 0, leg.km ?? 0, leg.lisatiedot ?? null, 
                leg.kalustoNro, status, // <-- Use 'In Progress'
                leg.vastaanottoNro ?? null, leg.reitti ?? null, leg.tunnit ?? 0, leg.kpl ?? 0
            ];

            const result = await client.query(insertQuery, params);
            createdLoadIds.push(result.rows[0].kuorma_id);

            if (leg.puutavaraId && leg.m3 && leg.m3 > 0) {
                const updateTimberEntryQuery = `UPDATE public.puutavaralaji SET haettu = haettu + $1, jaljella = jaljella - $1 WHERE puutavara_id = $2;`;
                await client.query(updateTimberEntryQuery, [leg.m3, leg.puutavaraId]);
            }
        }
        
        // --- FIX 2: Recalculate Puulaani Totals for each affected puulaani (Crucial for Map View) ---
        // Although the logic is more complex with bulk loads, for simplicity, we call the helper function
        // for the first leg's puulaani, as the frontend sends only one.
        if (legs[0].puulaaniId) {
             const recalculateQuery = `
                WITH ptl_summary AS (
                    SELECT
                        COALESCE(SUM(kuutiot), 0) as total_volume,
                        COALESCE(SUM(haettu), 0) as total_hauled
                    FROM public.puutavaralaji
                    WHERE puulaani_id = $1
                )
                UPDATE public.puulaani
                SET
                    kok = ptl_summary.total_volume,
                    jaljella = (ptl_summary.total_volume - ptl_summary.total_hauled)
                FROM ptl_summary
                WHERE puulaani_id = $1;
            `;
            await client.query(recalculateQuery, [legs[0].puulaaniId]);
        }

        await client.query('COMMIT');
        
        // Return the trip number and created IDs for confirmation
        return { 
            message: `${createdLoadIds.length} loads created and trip ${ajomaaraysNro} started successfully.`,
            ajomaaraysNro: ajomaaraysNro,
            createdLoadIds: createdLoadIds
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("!!! DATABASE ERROR while creating bulk loads:", error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Updates the status of all loads (legs) belonging to a single trip.
 * @param ajomaaraysNro The driving order number that identifies the trip.
 * @param status The new status to set for all legs.
 * @param driverId The ID of the driver, for authorization.
 */
export const updateTripStatus = async (ajomaaraysNro: string, status: string, driverId: number): Promise<{ count: number }> => {
    const query = `
        UPDATE public.kuorma
        SET status = $1
        WHERE ajomaarays_nro = $2 AND kulj_id = $3;
    `;
    try {
        const result = await pool.query(query, [status, ajomaaraysNro, driverId]);
        if (result.rowCount === 0) {
            // This could happen if the ajomaaraysNro doesn't exist or doesn't belong to the driver
            console.warn(`Attempted to update status for trip '${ajomaaraysNro}' by driver ${driverId}, but no rows were affected.`);
        }
        return { count: result.rowCount || 0 };
    } catch (error) {
        console.error(`Error updating status for trip ${ajomaaraysNro}:`, error);
        throw error;
    }
};

export const getTripById = async (id: number): Promise<any> => {
    // 1. First, check the Load Type
    const typeCheckQuery = `SELECT tyyppi FROM public.kuorma WHERE kuorma_id = $1`;
    const typeCheckResult = await pool.query(typeCheckQuery, [id]);

    if (typeCheckResult.rowCount === 0) {
        return null; // Load not found
    }

    const loadType = typeCheckResult.rows[0].tyyppi;

    // =========================================================
    // SCENARIO 1: CONSIGNMENT (Rahtikirja) - tyyppi = 1
    // =========================================================
    if (loadType === 1) {
        // Fetch Parent Load Details with Joins for display names
        const loadQuery = `
            SELECT 
                k.kuorma_id as "kuormaId",
                k.pvm,
                k.status,
                k.lisatiedot,
                k.m3, k.km, k.kpl, k.tunnit, -- Aggregates stored in parent
                k.tyyppi,
                k.kulj_id,
                k.kalusto_nro,
                k.asiakas_id,
                
                -- Joins for Names (Aliases must match Frontend expectations)
                a.asiakkaan_nimi as "asiakkaanNimi",
                kal.rek_nro as "rekNro",
                kul.nimi as "kuljettajanNimi"
            FROM public.kuorma k
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
            WHERE k.kuorma_id = $1
        `;
        const loadResult = await pool.query(loadQuery, [id]);
        const loadData = loadResult.rows[0];

        // Fetch Child Waybills with Customer Names
        const waybillsQuery = `
            SELECT 
                r.rahti_id as "rahtiId",
                r.asiakas_id as "asiakasId",
                a.asiakkaan_nimi as "customerName", -- Joined for display
                r.rahtikirjan_nro as "rahtikirjanNro",
                r.reitti,
                r.m3, 
                r.km, 
                r.kpl, 
                r.jako, 
                r.tievero, 
                r.lisatiedot
            FROM public.rahtikirja r
            LEFT JOIN public.asiakkaat a ON r.asiakas_id = a.asiakkaan_id
            WHERE r.kuorma_id = $1
            ORDER BY r.rahti_id ASC
        `;
        const waybillsResult = await pool.query(waybillsQuery, [id]);

        // Attach waybills array to the main object
        loadData.rahtikirjat = waybillsResult.rows;

        // Return CamelCased object (Manual aliasing in SQL handles most, but ensuring consistency)
        return camelcaseKeys(loadData);
    }

    // =========================================================
    // SCENARIO 2: TIMBER LOAD (Puukuorma) - tyyppi = 0
    // =========================================================
    else {
        // Fetch specific load to get driving order number
        const initialLoadQuery = 'SELECT ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro FROM public.kuorma WHERE kuorma_id = $1';
        const initialLoadResult = await pool.query(initialLoadQuery, [id]);
        const { ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro } = initialLoadResult.rows[0];
        const drivingOrderNumber = ajomaarays_nro;

        // Fetch all legs belonging to this trip
        const tripLegsQuery = `
            SELECT
                k.kuorma_id, k.pvm, k.status, k.m3, k.km, k.tunnit, k.kpl, k.reitti, k.vastaanotto_nro,
                k.kulj_id, k.ajomaarays_nro, k.lisatiedot,
                k.puulaani_id, k.puutavara_id,
                p.nimi AS origin_name, pp.purkupaikka AS destination_name,
                p.sijainti_lat AS origin_lat, p.sijainti_long AS origin_lng,
                pp.sijainti_lat AS destination_lat, pp.sijainti_long AS destination_lng,
                pt.puutavara AS task_timber_type_name,
                a.asiakkaan_nimi, kal.rek_nro, kul.nimi AS kuljettajan_nimi
            FROM public.kuorma k
            LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
            LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
            LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
            LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
            LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
            LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
            WHERE (k.ajomaarays_nro = $1 AND k.ajomaarays_nro IS NOT NULL) OR (k.kuorma_id = $2)
            ORDER BY k.kuorma_id ASC;
        `;
        const tripLegsResult = await pool.query(tripLegsQuery, [drivingOrderNumber, id]);
        
        if (tripLegsResult.rowCount === 0) return null;

        const firstLeg = tripLegsResult.rows[0];

        // Construct Timber Trip Details
        const tripDetails: ITripDetails = {
            tripId: drivingOrderNumber || `Trip #${id}`,
            ajomaaraysNro: drivingOrderNumber,
            asiakasId: asiakas_id,
            asiakkaanNimi: firstLeg.asiakkaan_nimi,
            rekNro: firstLeg.rek_nro,
            kalustoNro: kalusto_nro,
            kuljettajanNimi: firstLeg.kuljettajan_nimi,
            legs: camelcaseKeys(tripLegsResult.rows)
        };
        return tripDetails;
    }
};