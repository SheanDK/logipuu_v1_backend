// backend/src/services/rolePermissionService.ts
import pool from '../config/db';

import {
    SELECT_ALL_ROLES_WITH_PERMISSIONS,
    SELECT_ALL_PERMISSIONS,
    DELETE_PERMISSIONS_FOR_ROLE,
    INSERT_PERMISSION_FOR_ROLE
} from '../queries/roleQueries/rolePermissionQueries';
import { IRole, IPermission } from '../types';

// 1. Get All Roles and Permissions
export const getRolesAndPermissions = async (): Promise<IRole[]> => {
    const result = await pool.query(SELECT_ALL_ROLES_WITH_PERMISSIONS);
    return result.rows;
};

// 2. Get All Permissions
export const getAllPermissions = async (): Promise<IPermission[]> => {
    const result = await pool.query(SELECT_ALL_PERMISSIONS);
    return result.rows;
};

// 3. Update Permissions for Role
export const updatePermissionsForRole = async (roleId: number, permissionIds: number[]) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(DELETE_PERMISSIONS_FOR_ROLE, [roleId]);

        if (permissionIds && permissionIds.length > 0) {
            for (const permissionId of permissionIds) {
                if (typeof permissionId !== 'number' || isNaN(permissionId)) {
                    console.warn(`Skipping invalid permissionId during update: ${permissionId}`);
                    continue;
                }
                await client.query(INSERT_PERMISSION_FOR_ROLE, [roleId, permissionId]);
            }
        }

        await client.query('COMMIT');
        return { success: true, message: 'Permissions updated successfully.' };
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Error updating permissions for role ${roleId}:`, error);

        if (error.code === '23503') {
            throw new Error('Failed to update: Invalid role or permission ID provided.');
        }
        throw new Error('Failed to update permissions due to a server error.');
    } finally {
        client.release();
    }
};

// 4. Fetch All Roles List
export const fetchAllRolesList = async (): Promise<{ rooliId: number, roolinNimi: string }[]> => {
    const result = await pool.query('SELECT rooli_id as "rooliId", roolin_nimi as "roolinNimi" FROM public.roolit ORDER BY rooli_id');
    return result.rows;
}