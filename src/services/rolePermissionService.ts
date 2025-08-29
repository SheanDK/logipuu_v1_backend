// backend/src/services/rolePermissionService.ts
import pool from '../config/db';

// Assuming queries are in a file at this path
import {
    SELECT_ALL_ROLES_WITH_PERMISSIONS,
    SELECT_ALL_PERMISSIONS,
    DELETE_PERMISSIONS_FOR_ROLE,
    INSERT_PERMISSION_FOR_ROLE
} from '../queries/roleQueries/rolePermissionQueries';// Adjust path if needed

// Import from the centralized types/index.ts file
import { IRole, IPermission } from '../types';

export const getRolesAndPermissions = async (): Promise<IRole[]> => {
    const result = await pool.query(SELECT_ALL_ROLES_WITH_PERMISSIONS);
    // The query now returns "permissionIds" as a JSON array of numbers.
    return result.rows;
};

export const getAllPermissions = async (): Promise<IPermission[]> => {
    // The query aliases columns to match IPermission.
    const result = await pool.query(SELECT_ALL_PERMISSIONS);
    return result.rows;
};

// CORRECTED AND SIMPLIFIED FUNCTION
// The 'permissionIds' parameter is an array of numbers from the frontend.
export const updatePermissionsForRole = async (roleId: number, permissionIds: number[]) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction
        
        // 1. Delete all existing permissions for the role
        await client.query(DELETE_PERMISSIONS_FOR_ROLE, [roleId]);
        
        // 2. Insert new permissions one by one using the IDs provided by the frontend.
        if (permissionIds && permissionIds.length > 0) {
            for (const permissionId of permissionIds) {
                // Skip any invalid (null, non-number) IDs from the frontend array
                if (typeof permissionId !== 'number' || isNaN(permissionId)) {
                    console.warn(`Skipping invalid permissionId during update: ${permissionId}`);
                    continue;
                }
                // The simplified INSERT_PERMISSION_FOR_ROLE query is used here.
                await client.query(INSERT_PERMISSION_FOR_ROLE, [roleId, permissionId]);
            }
        }
        
        await client.query('COMMIT'); // Commit transaction
        return { success: true, message: 'Permissions updated successfully.' };
    } catch (error: any) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error(`Error updating permissions for role ${roleId}:`, error);
        
        // Check for specific database errors
        if (error.code === '23503') { // Foreign key violation (e.g., invalid roleId or permissionId)
            throw new Error('Failed to update: Invalid role or permission ID provided.');
        }
        throw new Error('Failed to update permissions due to a server error.');
    } finally {
        client.release();
    }
};

// This function stub seems unnecessary based on other functions.
// If you need a simple list of role names and IDs, it can be created like this:
export const fetchAllRolesList = async (): Promise<{ rooliId: number, roolinNimi: string }[]> => {
    const result = await pool.query('SELECT rooli_id as "rooliId", roolin_nimi as "roolinNimi" FROM public.roolit ORDER BY rooli_id');
    return result.rows;
}