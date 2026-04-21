// backend/src/services/userService.ts
import pool from '../config/db';
import bcrypt from 'bcryptjs';

import { UpdateUserProfileDto, ChangePasswordDto } from '../dto/user.dto';
import { UserProfileResponseDto } from '../types/user.types';

import * as userQueries from '../queries/userQueries';

// 1. Fetches the profile of the currently authenticated user.
export const getUserProfile = async (tunnus: string): Promise<UserProfileResponseDto> => {
    console.log(`SERVICE: Fetching profile for Tunnus: ${tunnus}`);
    const result = await pool.query(userQueries.SELECT_USER_PROFILE_BY_tunnus, [tunnus]);

    if (result.rows.length === 0) {
        throw new Error('User profile not found.');
    }

    const dbProfile = result.rows[0];

    const userProfileToReturn: UserProfileResponseDto = {
        username: dbProfile.tunnus,
        fullName: dbProfile.nimi,
        roles: dbProfile.roles || [],
        driverEmail: dbProfile.driverEmail || null,
        currentVehicleId: dbProfile.current_vehicle_id || null,
        currentVehicleRegNo: dbProfile.current_vehicle_reg_no || null,
    };

    return userProfileToReturn;
};

// 2. Updates the profile of the currently authenticated user.
export const updateUserProfile = async (
    tunnus: string,
    driverNumericIdFromToken: number | undefined | null,
    profileData: UpdateUserProfileDto
): Promise<UserProfileResponseDto> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (profileData.fullName) {
            await client.query(userQueries.UPDATE_USER_OWN_FULLNAME, [profileData.fullName, tunnus]);
        }

        if (profileData.email && driverNumericIdFromToken) {
            await client.query(userQueries.UPDATE_DRIVER_email_BY_kulj_id, [profileData.email, driverNumericIdFromToken]);
        }

        await client.query('COMMIT');
        return getUserProfile(tunnus);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`SERVICE ERROR: Failed to update profile for Tunnus ${tunnus}:`, error);
        throw new Error('Failed to update profile due to a server error.');
    } finally {
        client.release();
    }
};

// 3. Changes the password for the currently authenticated user.
export const changeUserPassword = async (tunnus: string, passwordData: ChangePasswordDto): Promise<{ message: string }> => {
    const { currentPassword, newPassword } = passwordData;

    const userPassResult = await pool.query(userQueries.SELECT_KAYTTAJAT_PASSWORD_BY_tunnus, [tunnus]);
    if (userPassResult.rows.length === 0) throw new Error('User not found or inactive.');

    const currentHash = userPassResult.rows[0].salasana;
    if (!currentHash) throw new Error('Cannot change password. Account security issue.');

    const isMatch = await bcrypt.compare(currentPassword, currentHash);
    if (!isMatch) throw new Error('Incorrect current password.');

    if (currentPassword === newPassword) throw new Error('New password cannot be the same as the current password.');

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(userQueries.UPDATE_USER_OWN_PASSWORD, [newPasswordHash, tunnus]);

    return { message: 'Password changed successfully.' };
};

// 4. Updates the current_vehicle_id and manages active sessions for the user.
export const updateUserCurrentVehicle = async (
    tunnus: string,
    vehicleId: number | null,
    userId: number,
    deviceInfo: string,
    tokenIdentifier: string,
    ipAddress: string,
): Promise<number | null> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (vehicleId !== null) {
            // 1. check if the vehicle is used by another driver
            const vehicleBusyQuery = `
                SELECT u.nimi, u.tunnus 
                FROM public.driver_active_sessions s
                JOIN public.kayttajat u ON s.user_id = u.kulj_id
                WHERE s.vehicle_id = $1 AND s.user_id != $2
                LIMIT 1
            `;

            const occupantRes = await client.query(vehicleBusyQuery, [vehicleId, userId]);
            if (occupantRes.rows.length > 0) {
                const occupant = occupantRes.rows[0];
                throw new Error(`This vehicle is currently in use by ${occupant.nimi} on another device.`);
            }

            // 2. check if the driver is already logged in to another vehicle
            const driverBusyQuery = `
                SELECT k.rek_nro 
                FROM public.driver_active_sessions s
                JOIN public.kalusto k ON s.vehicle_id = k.kalusto_nro
                WHERE s.user_id = $1 AND s.vehicle_id != $2
                LIMIT 1
            `;

            const driverRes = await client.query(driverBusyQuery, [userId, vehicleId]);
            if (driverRes.rows.length > 0) {
                const row = driverRes.rows[0];
                const currentRegNo = row.rek_nro || row.rekNro || "Unknown";
                throw new Error(`You are already using vehicle ${currentRegNo}. Please release it first before switching.`);
            }

            // 3. insert or update the session for this specific token
            await client.query(
                `INSERT INTO public.driver_active_sessions 
                    (user_id, vehicle_id, device_info, token_identifier, ip_address) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (token_identifier) 
                 DO UPDATE SET 
                    created_at = NOW(), 
                    ip_address = EXCLUDED.ip_address,
                    device_info = EXCLUDED.device_info`,
                [userId, vehicleId, deviceInfo, tokenIdentifier, ipAddress]
            );

            // update the vehicle number as a cache
            await client.query(
                `UPDATE public.kayttajat SET current_vehicle_id = $1 WHERE kulj_id = $2`,
                [vehicleId, userId]
            );

        } else {
            // when the driver logs out from one browser

            // 1. delete the session for this specific token
            await client.query(
                `DELETE FROM public.driver_active_sessions WHERE token_identifier = $1`,
                [tokenIdentifier]
            );

            // 2. check if the driver has any other active sessions
            const remainingSessionsRes = await client.query(
                `SELECT count(*) FROM public.driver_active_sessions WHERE user_id = $1`,
                [userId]
            );

            const activeCount = parseInt(remainingSessionsRes.rows[0].count);

            // 3. all sessions are ended
            if (activeCount === 0) {
                await client.query(
                    `UPDATE public.kayttajat SET current_vehicle_id = NULL WHERE kulj_id = $1`,
                    [userId]
                );
                console.log(`[SESSION] Vehicle released for Driver ${userId} - No more active sessions.`);
            } else {
                console.log(`[SESSION] Session closed for Driver ${userId}, but vehicle remains locked due to ${activeCount} other session(s).`);
            }
        }

        await client.query('COMMIT');

        const freshRes = await client.query(`SELECT current_vehicle_id FROM public.kayttajat WHERE kulj_id = $1`, [userId]);
        return freshRes.rows[0]?.current_vehicle_id || null;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};