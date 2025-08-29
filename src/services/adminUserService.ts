// backend/src/services/adminUserService.ts

import pool from '../config/db';
import bcrypt from 'bcryptjs';
import * as userQueries from '../queries/userQueries';
import { CreateUserDto, AdminUpdateUserDto } from '../dto/user.dto';

// --- READ OPERATIONS ---

export const adminGetAllUsers = async () => {
    const { rows } = await pool.query(userQueries.SELECT_ALL_USERS_FOR_ADMIN);
    return rows;
};

export const adminGetUserByTunnus = async (tunnus: string) => {
    const userResult = await pool.query(userQueries.SELECT_USER_BY_tunnus_FOR_ADMIN, [tunnus]);
    if (userResult.rows.length === 0) return null; // Returns null if not found
    
    const roleIdsResult = await pool.query(userQueries.SELECT_USER_ROLE_IDS_BY_TUNNUS, [tunnus]);
    
    const user = userResult.rows[0];
    user.roleIds = roleIdsResult.rows.map((r: { rooliId: number }) => r.rooliId);
    return user; // Returns the user object if found
};


// --- CREATE OPERATION ---
export const adminCreateNewUser = async (data: CreateUserDto) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingUser = await client.query('SELECT 1 FROM public.kayttajat WHERE tunnus = $1', [data.username]);
        if (existingUser.rowCount && existingUser.rowCount > 0) {
            throw new Error(`Username '${data.username}' already exists.`);
        }

        const passwordHash = await bcrypt.hash(data.password, 10);
        
        const DRIVER_ROLE_ID = 5; 
        let newDriverId: number | null = null;
        if (data.roleIds.includes(DRIVER_ROLE_ID)) {
            const driverInsertQuery = `INSERT INTO public.kuljettajat (nimi) VALUES ($1) RETURNING kulj_id;`;
            const driverResult = await client.query(driverInsertQuery, [data.fullName]);
            newDriverId = driverResult.rows[0].kulj_id;
        }

        const userLevel = data.roleIds.includes(1) || data.roleIds.includes(2) ? 2 : data.roleIds.includes(3) ? 3 : 4;

        const userParams = [data.username, data.fullName, passwordHash, data.isActive ?? true, userLevel, newDriverId];
        const newUserResult = await client.query(userQueries.INSERT_NEW_USER_BY_ADMIN, userParams);
        
        for (const roleId of data.roleIds) {
            await client.query(userQueries.ADD_USER_ROLE_MAPPING, [newUserResult.rows[0].tunnus, roleId]);
        }

        await client.query('COMMIT');
        // This function returns a user object or null, so the return type is correct.
        return adminGetUserByTunnus(newUserResult.rows[0].tunnus);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Error in adminCreateNewUser service:", error);
        if (error.code === '23505') throw new Error(`Username '${data.username}' already exists.`);
        throw error;
    } finally {
        client.release();
    }
};

// --- UPDATE OPERATION (CORRECTED) ---
export const adminUpdateUser = async (tunnus: string, data: AdminUpdateUserDto) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const existingUserResult = await client.query(userQueries.SELECT_USER_BY_tunnus_FOR_ADMIN, [tunnus]);
        if (existingUserResult.rowCount === 0) {
            // If user not found, return null explicitly. This fixes the truthiness error.
            return null;
        }
        const existingUser = existingUserResult.rows[0];

        const userParams = [data.fullName ?? existingUser.nimi, data.isActive ?? existingUser.aktiivinen, tunnus];
        await client.query(userQueries.UPDATE_USER_BY_ADMIN, userParams);

        if (data.roleIds && Array.isArray(data.roleIds)) {
            await client.query(userQueries.DELETE_USER_ROLE_MAPPINGS_BY_tunnus, [tunnus]);
            for (const roleId of data.roleIds) {
                await client.query(userQueries.ADD_USER_ROLE_MAPPING, [tunnus, roleId]);
            }
        }

        await client.query('COMMIT');
        
        // --- KEY CORRECTION IS HERE ---
        // Always return the result of fetching the user.
        // This function returns a user object or null, ensuring the return type is not void.
        return adminGetUserByTunnus(tunnus);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Error in adminUpdateUser service for user ${tunnus}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// --- DELETE OPERATION --- (No changes needed)
export const adminDeleteUser = async (tunnus: string) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(userQueries.DELETE_USER_ROLE_MAPPINGS_BY_tunnus, [tunnus]);
        const result = await client.query(userQueries.DELETE_USER_BY_tunnus_BY_ADMIN, [tunnus]);
        if (result.rowCount === 0) {
            throw new Error(`User '${tunnus}' not found for deletion.`);
        }
        await client.query('COMMIT');
        return { message: `User '${result.rows[0].tunnus}' and their roles have been deleted successfully.` };
    } catch (error: any) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to delete user '${tunnus}'.`);
    } finally {
        client.release();
    }
};