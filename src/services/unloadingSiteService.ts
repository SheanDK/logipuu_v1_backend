// backend/src/services/unloadingSiteService.ts
import pool from '../config/db';
import { IUnloadingSite } from '../types/unloadingSite.types';
import { CreateUnloadingSiteDto, UpdateUnloadingSiteDto } from '../dto/unloadingSite.dto';
import * as getQueries from '../queries/unloadingSiteQueries/getUnloadingSiteQueries';
import * as createQueries from '../queries/unloadingSiteQueries/createUnloadingSiteQueries';
import * as updateQueries from '../queries/unloadingSiteQueries/updateUnloadingSiteQueries';
// We are no longer using the hard delete queries from here
// import * as deleteQueries from '../queries/unloadingSiteQueries/deleteUnloadingSiteQueries';

export const getAllUnloadingSites = async (): Promise<IUnloadingSite[]> => {
    // This now correctly filters by is_active = TRUE because of the query change
    const result = await pool.query(getQueries.SELECT_ALL_UNLOADING_SITES);
    return result.rows;
};

export const getUnloadingSiteById = async (id: number): Promise<IUnloadingSite | null> => {
    // This can fetch any site, active or inactive
    const result = await pool.query(getQueries.SELECT_UNLOADING_SITE_BY_ID, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
};

export const getUnloadingSitesByClientId = async (clientId: number): Promise<IUnloadingSite[]> => {
    // This now correctly filters by is_active = TRUE because of the query change
    const result = await pool.query(getQueries.SELECT_UNLOADING_SITES_BY_CLIENT_ID, [clientId]);
    return result.rows;
};

export const createUnloadingSite = async (data: CreateUnloadingSiteDto): Promise<IUnloadingSite> => {
    // Your duplicate check logic is good, it remains the same.
    const checkQuery = `
        SELECT 1 
        FROM public.purkupaikka 
        WHERE 
            asiakas_id = $1 AND 
            purkupaikka ILIKE $2 AND 
            is_active = TRUE -- Only check against active sites for duplicates
    `;
    const existingSite = await pool.query(checkQuery, [data.clientId, data.name]);

    if (existingSite.rows.length > 0) {
        throw new Error('An active unloading site with this name already exists for this customer.');
    }

    const params = [data.clientId, data.name, data.latitude ?? null, data.longitude ?? null];
    const result = await pool.query(createQueries.INSERT_UNLOADING_SITE, params);
    
    const newSiteId = result.rows[0]?.purkupaikkaId;
    if (newSiteId) {
        const newSite = await getUnloadingSiteById(newSiteId);
        if (newSite) return newSite;
    }
    throw new Error('Unloading site creation failed.');
};

export const updateUnloadingSite = async (id: number, data: UpdateUnloadingSiteDto): Promise<IUnloadingSite | null> => {
    const existing = await getUnloadingSiteById(id);
    if (!existing || !existing.isActive) return null; // Can't update an inactive site

    const params = [
        data.clientId ?? existing.asiakasId,
        data.name ?? existing.purkupaikka,
        data.latitude ?? existing.sijaintiLat,
        data.longitude ?? existing.sijaintiLong,
        id
    ];
    await pool.query(updateQueries.UPDATE_UNLOADING_SITE_BY_ID, params);
    return getUnloadingSiteById(id);
};


// --- THIS IS THE MAJOR CHANGE ---
// This function now performs a "soft delete" instead of a "hard delete"
export const deleteUnloadingSite = async (id: number): Promise<{ purkupaikkaId: number; message: string } | null> => {
    
    console.log(`--- Performing SOFT DELETE for unloading site ID: ${id} ---`);

    // This query ONLY updates the is_active flag. It does NOT delete the row.
    // This will NOT trigger a foreign key constraint violation.
    const softDeleteQuery = 'UPDATE public.purkupaikka SET is_active = FALSE WHERE purkupaikka_id = $1 RETURNING purkupaikka_id;';
    
    try {
        const result = await pool.query(softDeleteQuery, [id]);

        if (result.rowCount === 0) {
            console.log(`Soft delete failed: Site with ID ${id} not found.`);
            return null;
        }
        
        console.log(`Successfully soft-deleted site with ID: ${id}`);
        return { 
            purkupaikkaId: result.rows[0].purkupaikkaId, 
            message: 'Unloading site marked as inactive successfully' 
        };

    } catch (error) {
        console.error(`Error during soft delete for site ID ${id}:`, error);
        // Re-throw the error to be caught by the controller's error handler
        throw error;
    }
};


export const updateUnloadingSiteVisibility = async (id: number, isVisible: boolean): Promise<IUnloadingSite | null> => {
    // Make sure we use the correct table name here. It's 'purkupaikka'.
    const query = 'UPDATE public.purkupaikka SET is_visible_on_map = $1 WHERE purkupaikka_id = $2 RETURNING *';
    
    const result = await pool.query(query, [isVisible, id]);
    if (result.rowCount === 0) return null;
    // Typo corrected: result.Rows -> result.rows
    return result.rows[0];
};