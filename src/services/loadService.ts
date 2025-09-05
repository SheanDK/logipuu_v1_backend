// backend/src/services/loadService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { ILoad, ILoadDetails, ILoadListItem } from '../types/load.types';
import { CreateLoadDto, UpdateLoadDto } from '../dto/load.dto';
import { UserPayload } from '../middlewares/authMiddleware'; // Import UserPayload
// We are removing the import from queries/index.ts to build the query dynamically here.
// import * as queries from '../queries/loadQueries/index';

// --- NEW: Define a type for the filters ---
export interface ILoadListFilters {
    asiakasId?: string;
    kalustoNro?: string;
    kuljId?: string;
    // We can add date filters later if needed
    // startDate?: string;
    // endDate?: string;
}

// --- THIS IS THE UPDATED FUNCTION ---
export const getAllLoadsForList = async (filters: ILoadListFilters): Promise<ILoadListItem[]> => {
    // Start with the base query
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
            k.is_active
        FROM
            public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.purkupaikka pp ON k.kohde = pp.purkupaikka
    `;

    const conditions: string[] = ['k.is_active = TRUE'];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    // Dynamically add WHERE clauses based on provided filters
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

    // Append the WHERE clauses to the query
    if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY k.pvm DESC, k.kuorma_id DESC;`;
    
    console.log('Executing filtered loads query:', queryText);
    console.log('Params:', queryParams);

    try {
        const result = await pool.query(queryText, queryParams);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error("Error fetching filtered loads:", error);
        throw new Error("Database query for fetching filtered loads failed.");
    }
};

// --- THIS IS THE NEW, IMPROVED getLoadById FUNCTION ---
export const getLoadById = async (id: number): Promise<ILoadDetails | null> => {
    const query = `
        SELECT
            k.kuorma_id,
            k.pvm,
            k.ajomaarays_nro,
            k.status,
            k.lisatiedot,
            k.m3 AS task_volume, -- The volume assigned to this specific trip/load
            k.kulj_id,

            a.asiakkaan_nimi,
            kal.rek_nro,
            kul.nimi AS kuljettajan_nimi,

            p.nimi AS origin_name,
            -- Assuming 'puulaani' table doesn't have address, using name as placeholder
            p.nimi AS origin_address, 
            p.sijainti_lat AS origin_lat,
            p.sijainti_long AS origin_lng,
            p.lisatiedot AS origin_instructions,

            pt.puutavara AS task_timber_type_name,
            pl.jaljella AS task_remaining_volume_before_this_trip,

            pp.purkupaikka AS destination_name,
            -- Assuming 'purkupaikka' table doesn't have address, using name as placeholder
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
        // Use camelcaseKeys to convert snake_case (e.g., kuorma_id) to camelCase (e.g., kuormaId)
        return camelcaseKeys(result.rows[0]) as ILoadDetails;
    } catch (error) {
        console.error(`Error fetching detailed load with ID ${id}:`, error);
        throw new Error(`Database query for fetching detailed load with ID ${id} failed.`);
    }
};

export const createLoad = async (data: CreateLoadDto): Promise<ILoad> => {
    // --- STEP 1: Log the exact data received by the service ---
    // This is a crucial debugging step.
    console.log('--- Service received data to create load ---', data);

    const {
        tyyppi, asiakasId, puulaaniId, kalustoNro, kuljId, pvm,
        ajomaaraysNro, kohde, lahto, m3, km, lisatiedot,
        puutavaraId
    } = data;

    const insertQuery = `
        INSERT INTO public.kuorma (
            tyyppi,         -- $1
            asiakas_id,     -- $2
            puulaani_id,    -- $3
            puutavara_id,   -- $4
            kulj_id,        -- $5
            pvm,            -- $6
            ajomaarays_nro, -- $7
            kohde,          -- $8
            lahto,          -- $9
            m3,             -- $10
            km,             -- $11
            lisatiedot,     -- $12
            kalusto_nro,    -- $13
            -- Hardcoded values
            tunnit, kpl, is_active
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            0, 0, TRUE
        )
        RETURNING *;
    `;

    // --- STEP 2: Ensure the params array matches the query placeholders exactly ---
    const params = [
        tyyppi,                 // $1
        asiakasId,              // $2
        puulaaniId ?? null,     // $3
        puutavaraId ?? null,    // $4  (This was missing before)
        kuljId,                 // $5
        pvm,                    // $6
        ajomaaraysNro ?? null,  // $7
        kohde ?? null,          // $8  (This will now be saved correctly)
        lahto ?? null,          // $9
        m3 ?? 0,                // $10
        km ?? 0,                // $11
        lisatiedot ?? null,     // $12
        kalustoNro              // $13
    ];

    console.log('--- Executing INSERT query for new load ---');
    console.log('Params:', params);

    try {
        const result = await pool.query(insertQuery, params);
        console.log('--- Load Created Successfully in DB ---');
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error("!!! DATABASE ERROR while creating new load:", error);
        throw new Error("Database query for creating a new load failed.");
    }
};

export const updateLoad = async (id: number, data: UpdateLoadDto, user: UserPayload): Promise<ILoad> => {
    const existingResult = await pool.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1', [id]);
    if (existingResult.rowCount === 0) {
        throw new Error('Load not found.');
    }
    const existingLoad = existingResult.rows[0];

    const isDriver = user.roles.includes('Kuljettaja');

    // --- SECURITY CHECK for Drivers ---
    if (isDriver && existingLoad.kulj_id !== user.driverNumericId) {
        throw new Error('You are not authorized to edit this load.');
    }

    // --- FIELD-LEVEL PERMISSIONS ---
    let fieldsToUpdate: any;

    if (isDriver) {
        // Drivers can only update a limited set of fields
        console.log(`--- Driver ${user.userId} is updating load ${id} ---`);
        fieldsToUpdate = {
            kalusto_nro: data.kalustoNro ?? existingLoad.kalusto_nro,
            pvm: data.pvm ?? existingLoad.pvm,
            ajomaarays_nro: data.ajomaaraysNro ?? existingLoad.ajomaarays_nro,
            m3: data.m3 ?? existingLoad.m3,
            km: data.km ?? existingLoad.km,
            lisatiedot: data.lisatiedot ?? existingLoad.lisatiedot,
        };
        // Ensure drivers cannot change critical data by overriding other fields from existing data
        fieldsToUpdate = {
            ...existingLoad,
            ...fieldsToUpdate
        }
    } else {
        // Office staff can update more fields
        console.log(`--- Office user ${user.userId} is updating load ${id} ---`);
        fieldsToUpdate = {
            tyyppi: data.tyyppi ?? existingLoad.tyyppi,
            asiakas_id: data.asiakasId ?? existingLoad.asiakas_id,
            puulaani_id: data.puulaaniId ?? existingLoad.puulaani_id,
            puutavara_id: data.puutavaraId ?? existingLoad.puutavara_id,
            kalusto_nro: data.kalustoNro ?? existingLoad.kalusto_nro,
            kulj_id: data.kuljId ?? existingLoad.kulj_id,
            pvm: data.pvm ?? existingLoad.pvm,
            ajomaarays_nro: data.ajomaaraysNro ?? existingLoad.ajomaarays_nro,
            kohde: data.kohde ?? existingLoad.kohde,
            lahto: data.lahto ?? existingLoad.lahto,
            m3: data.m3 ?? existingLoad.m3,
            km: data.km ?? existingLoad.km,
            lisatiedot: data.lisatiedot ?? existingLoad.lisatiedot,
        };
    }
    
    // Construct the query string and params array dynamically
    const fieldNames = Object.keys(fieldsToUpdate);
    const valuePlaceholders = fieldNames.map((_, index) => `$${index + 1}`).join(', ');
    const setClauses = fieldNames.map((name, index) => `${name} = $${index + 1}`).join(', ');
    
    const updateQuery = `UPDATE public.kuorma SET ${setClauses} WHERE kuorma_id = $${fieldNames.length + 1} RETURNING *;`;
    const params = [...Object.values(fieldsToUpdate), id];

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


// --- THIS IS THE NEW FUNCTION FOR THE DRIVER'S PORTAL ---
export const getMyLoadsForList = async (driverId: number): Promise<ILoadListItem[]> => {
    // We use the same base query as getAllLoadsForList, but add a specific condition for the driver
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
            k.is_active
        FROM
            public.kuorma k
        LEFT JOIN public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON k.puulaani_id = p.puulaani_id
        LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
        LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
        LEFT JOIN public.purkupaikka pp ON k.kohde = pp.purkupaikka
        -- The WHERE clause now filters for ACTIVE loads assigned to THIS specific driver
        WHERE k.is_active = TRUE AND k.kulj_id = $1
        ORDER BY k.pvm ASC, k.kuorma_id ASC; -- Order by date ascending for drivers
    `;
    
    console.log(`Executing "My Loads" query for driver ID: ${driverId}`);

    try {
        const result = await pool.query(queryText, [driverId]);
        return camelcaseKeys(result.rows);
    } catch (error) {
        console.error(`Error fetching loads for driver ID ${driverId}:`, error);
        throw new Error("Database query for fetching driver's loads failed.");
    }
};


// --- THIS IS THE NEW FUNCTION FOR STATUS UPDATES ---
export const updateLoadStatus = async (id: number, status: string, driverId: number): Promise<ILoad> => {
    console.log(`--- Driver ${driverId} is updating status of load ${id} to "${status}" ---`);

    // This query updates the status but ALSO verifies that the load belongs to the driver making the request.
    // This is a crucial security check.
    const updateQuery = `
        UPDATE public.kuorma 
        SET status = $1 
        WHERE kuorma_id = $2 AND kulj_id = $3
        RETURNING *;
    `;
    
    try {
        const result = await pool.query(updateQuery, [status, id, driverId]);

        if (result.rowCount === 0) {
            // This can happen if the load doesn't exist OR it's not assigned to this driver.
            console.warn(`Status update failed: Load ID ${id} not found or not assigned to driver ID ${driverId}.`);
            throw new Error('Load not found or you are not authorized to update it.');
        }
        
        console.log(`Successfully updated status for load ID: ${id}`);
        return camelcaseKeys(result.rows[0]);

    } catch (error) {
        console.error(`Error during status update for load ID ${id}:`, error);
        throw error;
    }
};