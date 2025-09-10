// backend/src/services/loadService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { ILoad, ILoadDetails, ILoadListItem } from '../types/load.types';
import { CreateLoadDto, UpdateLoadDto, CompleteLoadDto } from '../dto/load.dto';
import { UserPayload } from '../middlewares/authMiddleware';

export interface ILoadListFilters {
    asiakasId?: string;
    kalustoNro?: string;
    kuljId?: string;
    // --- NEW: Add status to the filters interface ---
    status?: 'active' | 'pending_inspection' | 'all';
}

export const getAllLoadsForList = async (filters: ILoadListFilters): Promise<ILoadListItem[]> => {
    let queryText = `
        SELECT
            k.kuorma_id, TO_CHAR(k.pvm, 'DD.MM.YYYY') AS pvm, k.ajomaarays_nro,
            k.vastaanotto_nro, kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            p.nimi AS puulaani_nimi, a.asiakkaan_nimi, pt.puutavara AS timber_type,
            k.reitti, k.m3, k.km, k.tunnit, k.kpl, k.lisatiedot, k.status, k.is_active
        FROM public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
    `;

    const conditions: string[] = ['k.is_active = TRUE'];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    // --- THIS IS THE FIX: Add a condition for billing status ---
    // By default, "Active Loads" should not include those already accepted for invoicing.
    if (filters.status === 'active') {
        conditions.push(`k.laskutukseen = 0`);
    }
    // Note: The 'pending_inspection' case is handled by a separate service function,
    // but if you wanted to merge them, you would add a condition here.

    if (filters.asiakasId) {
        conditions.push(`k.asiakas_id = $${paramIndex++}`);
        queryParams.push(parseInt(filters.asiakasId, 10));
    }
    if (filters.kalustoNro) {
        conditions.push(`k.kalusto_nro = $${paramIndex++}`);
        queryParams.push(parseInt(filters.kalustoNro, 10));
    }
    if (filters.kuljId) {
        conditions.push(`k.kulj_id = $${paramIndex++}`); 
        queryParams.push(parseInt(filters.kuljId, 10));
    }

    if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

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
        SELECT
            k.kuorma_id,
            k.pvm,
            k.ajomaarays_nro,
            k.status,
            k.lisatiedot,
            k.m3, -- Select the raw m3 value
            k.km,
            k.tunnit,
            k.kpl,
            k.vastaanotto_nro,
            k.reitti,
            k.kulj_id,
            k.asiakas_id,
            k.puulaani_id,
            k.puutavara_id,
            k.kalusto_nro,
            k.tyyppi,

            a.asiakkaan_nimi,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,

            p.nimi AS origin_name,
            p.nimi AS origin_address, 
            p.sijainti_lat AS origin_lat,
            p.sijainti_long AS origin_lng,
            p.lisatiedot AS origin_instructions,

            pt.puutavara AS task_timber_type_name,
            pl.jaljella AS task_remaining_volume_before_this_trip,

            pp.purkupaikka AS destination_name,
            pp.purkupaikka AS destination_address,
            pp.sijainti_lat AS destination_lat,
            pp.sijainti_long AS destination_lng
        FROM
            public.kuorma k
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
        if (result.rowCount === 0) {
            return null;
        }
        
        // --- THIS IS THE FIX ---
        // Manually create the object to match ILoadDetails perfectly,
        // especially to map 'm3' from the query to 'taskVolume' in the type.
        const row = camelcaseKeys(result.rows[0]);
        const detailedLoad: ILoadDetails = {
            ...row,
            taskVolume: row.m3, // Map the 'm3' column to the 'taskVolume' property
        };

        return detailedLoad;

    } catch (error) {
        console.error(`Error fetching detailed load with ID ${id}:`, error);
        throw new Error(`Database query for fetching detailed load with ID ${id} failed.`);
    }
};

export const createLoad = async (data: CreateLoadDto): Promise<ILoad> => {
    const { tyyppi, asiakasId, puulaaniId, kalustoNro, kuljId, pvm, ajomaaraysNro, kohde, lahto, m3, km, lisatiedot, puutavaraId } = data;
    const insertQuery = `INSERT INTO public.kuorma (tyyppi, asiakas_id, puulaani_id, puutavara_id, kulj_id, pvm, ajomaarays_nro, kohde, lahto, m3, km, lisatiedot, kalusto_nro, tunnit, kpl, is_active, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, 0, TRUE, 'Assigned') RETURNING *;`;
    const params = [ tyyppi, asiakasId, puulaaniId ?? null, puutavaraId ?? null, kuljId, pvm, ajomaaraysNro ?? null, kohde ?? null, lahto ?? null, m3 ?? 0, km ?? 0, lisatiedot ?? null, kalustoNro ];
    try {
        const result = await pool.query(insertQuery, params);
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error("!!! DATABASE ERROR while creating new load:", error);
        throw new Error("Database query for creating a new load failed.");
    }
};

export const updateLoad = async (id: number, data: UpdateLoadDto, user: UserPayload): Promise<ILoad> => {
    const { rows: existingRows, rowCount } = await pool.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
    if (rowCount === 0) {
        throw new Error('Load not found.');
    }
    const existingLoad = existingRows[0];

    const isDriver = user.roles.includes('Kuljettaja');

    if (isDriver && existingLoad.kulj_id !== user.driverNumericId) {
        throw new Error('You are not authorized to edit this load.');
    }

    // --- THIS IS THE FIX ---
    // Build a complete, new object by merging new data over the existing data.
    // This ensures no existing IDs are accidentally set to null.
    const mergedData = {
        tyyppi: data.tyyppi ?? existingLoad.tyyppi,
        asiakas_id: data.asiakasId ?? existingLoad.asiakas_id,
        puulaani_id: data.puulaaniId ?? existingLoad.puulaani_id,
        puutavara_id: data.puutavaraId ?? existingLoad.puutavara_id,
        kalusto_nro: data.kalustoNro ?? existingLoad.kalusto_nro,
        kulj_id: data.kuljId ?? existingLoad.kulj_id,
        pvm: data.pvm ?? existingLoad.pvm,
        ajomaarays_nro: data.ajomaaraysNro ?? existingLoad.ajomaarays_nro,
        vastaanotto_nro: data.vastaanottoNro ?? existingLoad.vastaanotto_nro,
        kohde: data.kohde ?? existingLoad.kohde,
        lahto: data.lahto ?? existingLoad.lahto,
        reitti: data.reitti ?? existingLoad.reitti,
        m3: data.m3 ?? existingLoad.m3,
        km: data.km ?? existingLoad.km,
        tunnit: data.tunnit ?? existingLoad.tunnit,
        kpl: data.kpl ?? existingLoad.kpl,
        lisatiedot: data.lisatiedot ?? existingLoad.lisatiedot,
    };

    let params: any[];
    let setClauses: string;

    if (isDriver) {
        // Drivers have a restricted set of updatable fields.
        setClauses = `pvm = $1, m3 = $2, km = $3, lisatiedot = $4, kohde = $5`;
        params = [ mergedData.pvm, mergedData.m3, mergedData.km, mergedData.lisatiedot, mergedData.kohde, id ];
    } else {
        // Office staff can update a wider set of fields.
        setClauses = `
            pvm = $1, vastaanotto_nro = $2, reitti = $3, m3 = $4, km = $5,
            tunnit = $6, kpl = $7, lisatiedot = $8
        `;
        params = [
            mergedData.pvm, mergedData.vastaanotto_nro, mergedData.reitti, mergedData.m3, mergedData.km,
            mergedData.tunnit, mergedData.kpl, mergedData.lisatiedot, id
        ];
    }
    
    const updateQuery = `UPDATE public.kuorma SET ${setClauses} WHERE kuorma_id = $${params.length} RETURNING *;`;

    try {
        const result = await pool.query(updateQuery, params);
        console.log(`--- Load ID: ${id} Updated Successfully by ${user.userId} ---`);
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error(`!!! DATABASE ERROR while updating load ID ${id}:`, error);
        throw new Error("Database query for updating the load failed.");
    }
};

export const deleteLoad = async (id: number): Promise<{ kuormaId: number; message: string } | null> => {
    console.log(`--- Performing SOFT DELETE for load ID: ${id} ---`);

    // This query ONLY updates the is_active flag.
    const softDeleteQuery = 'UPDATE public.kuorma SET is_active = FALSE WHERE kuorma_id = $1 RETURNING kuorma_id;';
    
    try {
        const result = await pool.query(softDeleteQuery, [id]);

        if (result.rowCount === 0) {
            console.log(`Soft delete failed: Load with ID ${id} not found.`);
            return null;
        }
        
        console.log(`Successfully soft-deleted load with ID: ${id}`);
        return { 
            kuormaId: result.rows[0].kuorma_id, 
            message: 'Load marked as inactive successfully' 
        };

    } catch (error) {
        console.error(`Error during soft delete for load ID ${id}:`, error);
        throw error;
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
    let queryText = `
        SELECT
            k.kuorma_id, TO_CHAR(k.pvm, 'YYYY-MM-DD') AS pvm, a.asiakkaan_nimi,
            COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
            COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
            kal.rek_nro, kul.nimi AS kuljettajan_nimi,
            CASE WHEN k.tyyppi = 0 THEN 'Puulaani' WHEN k.tyyppi = 1 THEN 'Pole Transport' ELSE 'Unknown' END AS tyyppi,
            k.is_active, k.status
        FROM
            public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        -- --- THIS IS THE FIX ---
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.puutavaralaji pl ON k.puutavara_id = pl.puutavara_id
        LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
        -- The WHERE clause now filters for ACTIVE loads assigned to THIS specific driver
        WHERE k.is_active = TRUE AND k.kulj_id = $1
        ORDER BY k.pvm ASC, k.kuorma_id ASC;
    `;
    
    try {
        const result = await pool.query(queryText, [driverId]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`Error fetching loads for driver ID ${driverId}:`, error);
        throw new Error("Database query for fetching driver's loads failed.");
    }
};




// --- THIS IS THE NEW FUNCTION FOR COMPLETING A LOAD ---
export const completeLoad = async (loadId: number, driverId: number, data: CompleteLoadDto): Promise<ILoad> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start a database transaction

        // 1. Fetch the load and ensure it belongs to the driver and is in a completable state
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

        // 2. Update the kuorma table with actuals and set status to 'Completed'
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

        // 3. Update the puutavaralaji table (the timber task)
        if (load.puutavara_id) {
            const updateTaskQuery = `
                UPDATE public.puutavaralaji
                SET 
                    haettu = haettu + $1, -- Add the actual volume to the retrieved amount
                    jaljella = jaljella - $1 -- Subtract the actual volume from the remaining amount
                WHERE puutavara_id = $2;
            `;
            await client.query(updateTaskQuery, [data.actualM3, load.puutavara_id]);
        }
        
        await client.query('COMMIT'); // Commit the transaction
        console.log(`--- Load ${loadId} completed successfully and timber task updated ---`);
        return camelcaseKeys(updatedLoadResult.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK'); // Roll back the transaction on error
        console.error(`Error completing load ${loadId}:`, error);
        throw error; // Re-throw the error to be handled by the controller
    } finally {
        client.release(); // Release the client back to the pool
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