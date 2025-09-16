// backend/src/services/loadService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { ILoad, ILoadDetails, ILoadListItem, IMapTrip } from '../types/load.types';
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

    // --- THIS IS THE FIX FOR FILTERING LOGIC ---
     if (filters.status === 'active') {
        conditions.push(`k.status != 'Completed'`);
        conditions.push(`k.is_active = TRUE`);
    } 
    // Change 'inspection' to 'pending_inspection' to match the interface
    else if (filters.status === 'pending_inspection') { 
        conditions.push(`k.status = 'Completed'`);
        conditions.push(`k.laskutukseen = 0`);
        conditions.push(`k.is_active = TRUE`);
    } else {
        // "All" just filters by is_active = TRUE
        conditions.push(`k.is_active = TRUE`);
    }

    // Add other filters
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

// --- THIS IS THE UPDATED, SECURE updateLoad FUNCTION ---
export const updateLoad = async (id: number, data: UpdateLoadDto, user: UserPayload): Promise<ILoad> => {
    const { rows: existingRows, rowCount } = await pool.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1 FOR UPDATE', [id]);
    if (rowCount === 0) {
        throw new Error('Load not found.');
    }
    const existingLoad = existingRows[0];

    const isDriver = user.roles.includes('Kuljettaja');

    // Security Check 1: Drivers can only edit their own loads.
    if (isDriver && existingLoad.kulj_id !== user.driverNumericId) {
        throw new Error('You are not authorized to edit this load.');
    }

    // Security Check 2: Drivers can only edit loads that are in 'Assigned' state.
    if (isDriver && existingLoad.status !== 'Assigned') {
        throw new Error('This load is already in progress and cannot be edited.');
    }

    let fieldsToUpdate: Partial<ILoad>;

    if (isDriver) {
        // DRIVERS have a restricted set of updatable fields.
        console.log(`--- Driver ${user.userId} is updating load ${id} ---`);
        fieldsToUpdate = {
            kalustoNro: data.kalustoNro,
            pvm: data.pvm,
            ajomaaraysNro: data.ajomaaraysNro,
            m3: data.m3,
            km: data.km,
            lisatiedot: data.lisatiedot,
            kohde: data.kohde
        };
    } else {
        // OFFICE STAFF can update a wider set of fields.
        console.log(`--- Office user ${user.userId} is updating load ${id} ---`);
        fieldsToUpdate = {
            tyyppi: data.tyyppi,
            asiakasId: data.asiakasId,
            puulaaniId: data.puulaaniId,
            puutavaraId: data.puutavaraId,
            kalustoNro: data.kalustoNro,
            kuljId: data.kuljId,
            pvm: data.pvm,
            ajomaaraysNro: data.ajomaaraysNro,
            vastaanottoNro: data.vastaanottoNro,
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

    // Filter out undefined values so we only build the query with fields that were actually passed
    const updates: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
        if (value !== undefined) {
            // Convert camelCase key from DTO to snake_case for the database query
            const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            updates[snakeCaseKey] = value;
        }
    }

    // If no valid fields were passed to update, return the existing data without hitting the DB
    if (Object.keys(updates).length === 0) {
        console.log(`--- No valid fields to update for load ${id}, returning existing data ---`);
        return camelcaseKeys(existingLoad);
    }
    
    // Dynamically build the SET clause for the SQL query
    const setClauses = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const params = [...Object.values(updates), id];
    
    const updateQuery = `UPDATE public.kuorma SET ${setClauses} WHERE kuorma_id = $${params.length} RETURNING *;`;

    console.log('--- Executing UPDATE query for load ---');
    console.log('Query:', updateQuery);
    console.log('Params:', params);

    try {
        const result = await pool.query(updateQuery, params);
        console.log(`--- Load ID: ${id} Updated Successfully ---`);
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
        -- --- THIS IS THE FIX ---
        -- Filter for loads that are ACTIVE, assigned to THIS driver, AND are NOT COMPLETED.
        WHERE 
            k.is_active = TRUE 
            AND k.kulj_id = $1
            AND k.status != 'Completed'
        ORDER BY 
            k.pvm ASC, k.kuorma_id ASC; -- Order by date ascending for drivers
    `;
    
    try {
        const result = await pool.query(queryText, [driverId]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`Error fetching active loads for driver ID ${driverId}:`, error);
        throw new Error("Database query for fetching driver's active loads failed.");
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