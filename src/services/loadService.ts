// backend/src/services/loadService.ts
import pool from '../config/db';
import camelcaseKeys from 'camelcase-keys';
import { ILoad, ILoadListItem } from '../types/load.types';
import { CreateLoadDto, UpdateLoadDto } from '../dto/load.dto';
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

export const getLoadById = async (id: number): Promise<ILoad | null> => {
    try {
        // We select directly from the 'kuorma' table to get the raw data object.
        const result = await pool.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1', [id]);
        if (result.rowCount === 0) {
            return null; // Not found
        }
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error(`Error fetching load with ID ${id}:`, error);
        throw new Error(`Database query for fetching load with ID ${id} failed.`);
    }
};

export const createLoad = async (data: CreateLoadDto): Promise<ILoad> => {
    const {
        tyyppi, asiakasId, puulaaniId, kalustoNro, kuljId, pvm,
        ajomaaraysNro, kohde, lahto, m3, km, lisatiedot,
        puutavaraId // Get the new property
    } = data;

    const insertQuery = `
        INSERT INTO public.kuorma (
            tyyppi, asiakas_id, puulaani_id, puutavara_id, 
            kulj_id, pvm, ajomaarays_nro, kohde, lahto,
            m3, km, tunnit, kpl, lisatiedot, kalusto_nro, is_active
        ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, 0, $12, $13, TRUE )
        RETURNING *;
    `;
    const params = [
        tyyppi, 
        asiakasId, 
        puulaaniId ?? null,
        puutavaraId ?? null, // <<< ADDED HERE
        kuljId, 
        pvm, 
        ajomaaraysNro ?? 
        null, kohde ?? null, 
        lahto ?? null,
        m3 ?? 0, 
        km ?? 0, 
        lisatiedot ?? null, 
        kalustoNro
    ];

    console.log('--- Creating New Load ---');
    console.log('Query:', insertQuery);
    console.log('Params:', params);

    try {
        const result = await pool.query(insertQuery, params);
        console.log('--- Load Created Successfully ---');
        return camelcaseKeys(result.rows[0]);
    } catch (error) {
        console.error("!!! DATABASE ERROR while creating new load:", error);
        // Re-throw a more generic error to the frontend for security
        throw new Error("Database query for creating a new load failed.");
    }
};

export const updateLoad = async (id: number, data: UpdateLoadDto): Promise<ILoad> => {
    // First, fetch the existing record to make sure it exists
    const existingResult = await pool.query('SELECT * FROM public.kuorma WHERE kuorma_id = $1', [id]);
    if (existingResult.rowCount === 0) {
        throw new Error('Load not found.'); // Or handle as a 404 error in the controller
    }
    const existingLoad = existingResult.rows[0];

    // Build the UPDATE query dynamically
    // This prevents accidentally overwriting fields with null if they aren't provided in `data`
    const fields = {
        tyyppi: data.tyyppi ?? existingLoad.tyyppi,
        asiakas_id: data.asiakasId ?? existingLoad.asiakas_id,
        puulaani_id: data.puulaaniId ?? existingLoad.puulaani_id,
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

    const updateQuery = `
        UPDATE public.kuorma SET
            tyyppi = $1, asiakas_id = $2, puulaani_id = $3, kalusto_nro = $4,
            kulj_id = $5, pvm = $6, ajomaarays_nro = $7, kohde = $8,
            lahto = $9, m3 = $10, km = $11, lisatiedot = $12
        WHERE kuorma_id = $13
        RETURNING *;
    `;

    const params = [...Object.values(fields), id];

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