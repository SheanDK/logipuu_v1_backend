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

        // After transaction, fetch the latest profile data to return to the client
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

// 4. Updates the current_vehicle_id for the user.
export const updateUserCurrentVehicle = async (tunnus: string, vehicleId: number | null): Promise<number | null> => {
    const result = await pool.query(userQueries.UPDATE_USER_CURRENT_VEHICLE, [vehicleId, tunnus]);
    if (result.rows.length === 0) {
        throw new Error('User not found.');
    }
    return result.rows[0].current_vehicle_id;
};