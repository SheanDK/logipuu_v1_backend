// backend/src/services/loadService.ts

import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { ILoad, ILoadDetails, ILoadListItem, IMapTrip, ITripDetails } from '../types/load.types';
import { CreateLoadDto, UpdateLoadDto, CompleteLoadDto } from '../dto/load.dto';
import { UserPayload } from '../middlewares/authMiddleware';

export interface ILoadListFilters {
    asiakasId?: string;
    kalustoNro?: string;
    kuljId?: string;
    status?: 'active' | 'pending_inspection' | 'all';
}

export const getAllLoadsForList = async (filters: ILoadListFilters): Promise<ILoadListItem[]> => {
    let queryText = `
        SELECT
            k.kuorma_id, TO_CHAR(k.pvm, 'DD.MM.YYYY') AS pvm, k.ajomaarays_nro,
            k.vastaanotto_nro, kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            p.nimi AS puulaani_nimi, a.asiakkaan_nimi, pt.puutavara AS timber_type,
            k.reitti, k.m3, k.km, k.tunnit, k.kpl, k.lisatiedot, k.status, k.is_active,
            p.sijainti_lat as origin_lat, p.sijainti_long as origin_lng
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

export const getTripByLoadId = async (id: number): Promise<ITripDetails | null> => {
    const initialLoadQuery = 'SELECT ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro FROM public.kuorma WHERE kuorma_id = $1';
    const initialLoadResult = await pool.query(initialLoadQuery, [id]);
    
    if (initialLoadResult.rowCount === 0) {
        console.error(`[getTripById] Initial load with ID ${id} not found.`);
        return null;
    }

    const { ajomaarays_nro, asiakas_id, kulj_id, kalusto_nro } = initialLoadResult.rows[0];
    const drivingOrderNumber = ajomaarays_nro;

    const tripLegsQuery = `
        SELECT
            k.kuorma_id, k.pvm, k.status, k.m3, k.kulj_id, k.ajomaarays_nro, k.lisatiedot,
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

    const tripDetails: ITripDetails = {
        // --- THIS IS THE FIX ---
        tripId: drivingOrderNumber || `Trip #${id}`, // The display ID
        ajomaaraysNro: drivingOrderNumber, // The actual data field
        asiakasId: asiakas_id,
        asiakkaanNimi: firstLeg.asiakkaan_nimi,
        rekNro: firstLeg.rek_nro,
        kalustoNro: kalusto_nro,
        kuljettajanNimi: firstLeg.kuljettajan_nimi,
        legs: camelcaseKeys(tripLegsResult.rows)
    };
    return tripDetails;
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
            const autoResult = await client.query(
                'SELECT auto_id FROM public.autot WHERE puulaani_id = $1 AND kalusto_id = $2 LIMIT 1',
                [puulaaniId, kalustoNro]
            );

            // --- THIS IS THE FIX ---
            // Add a check to ensure autoResult is not null before accessing its properties
            if (autoResult && (autoResult.rowCount ?? 0) > 0) {
                autoId = autoResult.rows[0].auto_id;
            } else {
                console.warn(`No entry found in 'autot' table for puulaani_id=${puulaaniId} and kalusto_id=${kalustoNro}. 'auto_id' will be null.`);
            }
        }
        
        const insertQuery = `
            INSERT INTO public.kuorma 
            (tyyppi, asiakas_id, puulaani_id, puutavara_id, auto_id, kulj_id, pvm, ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, status, vastaanotto_nro) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Assigned', $15) 
            RETURNING *;
        `;
        const params = [ 
            tyyppi, asiakasId, puulaaniId ?? null, puutavaraId ?? null, autoId,
            kuljId, pvm, ajomaaraysNro ?? null, kohde ?? null, lahto ?? null, 
            m3 ?? 0, km ?? 0, lisatiedot ?? null, kalustoNro, vastaanottoNro ?? null
        ];
        const result = await client.query(insertQuery, params);
        const newLoad = result.rows[0];

        if (puutavaraId && m3 && m3 > 0) {
            const updateTimberEntryQuery = `
                UPDATE public.puutavaralaji
                SET
                    haettu = haettu + $1,
                    jaljella = jaljella - $1
                WHERE puutavara_id = $2;
            `;
            await client.query(updateTimberEntryQuery, [m3, puutavaraId]);
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

// export const createLoad = async (data: CreateLoadDto): Promise<ILoad> => {
//     // Destructure all required fields from data
//     const { tyyppi, asiakasId, puulaaniId, kalustoNro, kuljId, pvm, ajomaaraysNro, kohde, lahto, m3, km, lisatiedot, puutavaraId } = data;
    
//     const client = await pool.connect();
//      try {
//         await client.query('BEGIN');

//         // --- THIS IS THE NEW LOGIC WITH THE FIX ---
//         // Step 1: Find the 'auto_id' from the 'autot' table using puulaaniId and kalustoNro
//         let autoId: number | null = null;
//         if (puulaaniId && kalustoNro) {
//             const autoResult = await client.query(
//                 'SELECT auto_id FROM public.autot WHERE puulaani_id = $1 AND kalusto_id = $2 LIMIT 1',
//                 [puulaaniId, kalustoNro]
//             );

//             // Add a check to ensure autoResult is not null before accessing rowCount
//             if (autoResult?.rowCount && autoResult.rowCount > 0) {
//                 autoId = autoResult.rows[0].auto_id;
//             } else {
//                 console.warn(`No entry found in 'autot' table for puulaani_id=${puulaaniId} and kalusto_id=${kalustoNro}. 'auto_id' will be null.`);
//             }
//         }
        
//         // Step 2: Insert into 'kuorma' table, now including the 'auto_id'
//         const insertQuery = `
//             INSERT INTO public.kuorma 
//             (tyyppi, asiakas_id, puulaani_id, puutavara_id, auto_id, kulj_id, pvm, ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, status) 
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Assigned') 
//             RETURNING *;
//         `;
//         const params = [ 
//             tyyppi, asiakasId, puulaaniId ?? null, puutavaraId ?? null, autoId,
//             kuljId, pvm, ajomaaraysNro ?? null, kohde ?? null, lahto ?? null, 
//             m3 ?? 0, km ?? 0, lisatiedot ?? null, kalustoNro 
//         ];
        
//         const result = await client.query(insertQuery, params);
        
//         await client.query('COMMIT');
//         return camelcaseKeys(result.rows[0]);

//     } catch (error) {
//         await client.query('ROLLBACK');
//         console.error("!!! DATABASE ERROR while creating new load:", error);
//         throw new Error("Database query for creating a new load failed.");
//     } finally {
//         client.release();
//     }
// };

// --- THIS IS THE UPDATED, SECURE updateLoad FUNCTION ---
export const updateLoad = async (id: number, data: UpdateLoadDto, user: UserPayload): Promise<ILoad> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const { rows, rowCount } = await client.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);

        if (rowCount === 0) {
            throw new Error(`Load with ID ${id} not found.`);
        }
        
        const existingLoad = rows[0];

        console.log(`[DEBUG] updateLoad: User ID=${user.driverNumericId} vs Load's Driver ID=${existingLoad.kulj_id}`);
        console.log(`[DEBUG] updateLoad: Load's current status is '${existingLoad.status}'`);
        
        const isDriver = user.roles.includes('Kuljettaja');

        if (isDriver && existingLoad.kulj_id !== user.driverNumericId) {
            throw new Error('You are not authorized to edit this load.');
        }

        if (isDriver && existingLoad.status !== 'Assigned') {
            throw new Error('This load is already in progress and cannot be edited.');
        }

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
            // Office users can update a wider set of fields
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
            // Keys should already be in snake_case
            if (value !== undefined) {
                updates[key] = value;
            }
        }

        if (Object.keys(updates).length === 0) {
            return camelcaseKeys(existingLoad) as ILoad;
        }
        
        const setClauses = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
        const params = [...Object.values(updates), id];
        const updateQuery = `UPDATE public.kuorma SET ${setClauses} WHERE kuorma_id = $${params.length} RETURNING *;`;

        const result = await client.query(updateQuery, params);
        
        await client.query('COMMIT');
        return camelcaseKeys(result.rows[0]) as ILoad;

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
        
        // First, get the load to perform checks
        const loadResult = await client.query('SELECT kulj_id, status FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
        if (loadResult.rowCount === 0) {
            return null; // Not found
        }
        const existingLoad = loadResult.rows[0];

        const isDriver = user.roles.includes('Kuljettaja');

        // --- SECURITY CHECKS ---
        if (isDriver) {
            // 1. Driver must own the load
            if (existingLoad.kulj_id !== user.driverNumericId) {
                throw new Error('Forbidden: You are not authorized to delete this load.');
            }
            // 2. Driver can only delete loads that have not yet started
            if (existingLoad.status !== 'Assigned') {
                throw new Error(`Cannot delete a load that is already in progress (Status: ${existingLoad.status}).`);
            }
        }
        // Office staff can delete (soft delete) any load (as per original logic).

        const softDeleteQuery = 'UPDATE public.kuorma SET is_active = FALSE WHERE kuorma_id = $1 RETURNING kuorma_id;';
        const result = await client.query(softDeleteQuery, [id]);

        await client.query('COMMIT');
        
        console.log(`Successfully soft-deleted load with ID: ${id} by user: ${user.userId}`);
        return { 
            kuormaId: result.rows[0].kuorma_id, 
            message: 'Load marked as inactive successfully' 
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
        return camelcaseKeys(result.rows[0]);
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
    
    // This query is very similar to getAllLoadsForList, but with specific status filters
    const queryText = `
        SELECT
            k.kuorma_id,
            TO_CHAR(k.pvm, 'DD.MM.YYYY') AS pvm,
            k.ajomaarays_nro,
            k.vastaanotto_nro,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            p.nimi AS puulaani_nimi,
            a.asiakkaan_nimi,
            pt.puutavara AS timber_type,
            k.reitti,
            k.m3,
            k.km,
            k.tunnit,
            k.kpl,
            k.lisatiedot,
            k.status,
            k.is_active
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
            k.pvm ASC, k.kuorma_id ASC; -- Order oldest first
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
    let queryText = `
        SELECT
            k.kuorma_id,
            TO_CHAR(k.pvm, 'YYYY-MM-DD') AS pvm,
            a.asiakkaan_nimi,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,
            CASE
                WHEN k.tyyppi = 0 THEN 'Puulaani'
                WHEN k.tyyppi = 1 THEN 'Pole Transport'
                ELSE 'Unknown'
            END AS tyyppi,
            k.is_active,
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
            k.is_active = TRUE 
            AND k.kulj_id = $1
            AND k.status = 'Completed' -- The only difference is this line
        ORDER BY 
            k.pvm DESC, k.kuorma_id DESC; -- Show most recent completed trips first
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