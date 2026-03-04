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

export const adminGetUserByTunnus = async (username: string) => {
    const clean = username?.trim();
    console.log('[adminGetUserByTunnus] IN tunnus =', JSON.stringify(clean));
    const { rows } = await pool.query(userQueries.SELECT_USER_WITH_ROLES_FOR_ADMIN, [clean]);
    console.log('[adminGetUserByTunnus] rows.length =', rows.length);
    return rows[0] ?? null;
};


// --- CREATE OPERATION ---
export const adminCreateNewUser = async (data: any) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // check if the username already exists
        const existingUser = await client.query('SELECT 1 FROM public.kayttajat WHERE tunnus = $1', [data.username]);
        if (existingUser.rowCount && existingUser.rowCount > 0) {
            throw new Error(`Username '${data.username}' already exists.`);
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        // connect to the driver
        const linkedDriverId = data.kuljId || null;
        const userLevel = data.roleIds.includes(1) || data.roleIds.includes(2) ? 1 : data.roleIds.includes(3) ? 3 : 4;
        // connect to the driver
        const userParams = [
            data.username,
            data.fullName,
            passwordHash,
            data.isActive ?? true,
            userLevel,
            linkedDriverId
        ];

        const newUserResult = await client.query(userQueries.INSERT_NEW_USER_BY_ADMIN, userParams);

        // connect to the roles
        for (const roleId of data.roleIds) {
            await client.query(userQueries.ADD_USER_ROLE_MAPPING, [newUserResult.rows[0].tunnus, roleId]);
        }

        await client.query('COMMIT');
        return adminGetUserByTunnus(newUserResult.rows[0].tunnus);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error("Error in adminCreateNewUser service:", error);
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

        return adminGetUserByTunnus(tunnus);

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`Error in adminUpdateUser service for user ${tunnus}:`, error);
        throw error;
    } finally {
        client.release();
    }
};

// --- DELETE OPERATION ---
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