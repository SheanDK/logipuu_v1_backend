// backend/src/services/driverService.ts
import pool from '../config/db';
import {
    CreateDriverDto,
    UpdateDriverDto
} from '../dto/driver.dto';

import * as getQueries from '../queries/driverQueries/getDriverQueries';
import * as createQueries from '../queries/driverQueries/createDriverQueries';
import * as updateQueries from '../queries/driverQueries/updateDriverQueries';
import * as deleteQueries from '../queries/driverQueries/deleteDriverQueries';

// 1. Get all drivers
export const getAllDrivers = async () => {
    const result = await pool.query(getQueries.SELECT_ALL_DRIVERS);
    return result.rows;
};

// 2. Get driver by ID
export const getDriverById = async (id: number) => {
    const result = await pool.query(getQueries.SELECT_DRIVER_BY_ID, [id]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0];
};

// 3. Create a new driver
export const createDriver = async (driverData: CreateDriverDto) => {
    const { name, phoneNo, email, hasAlerts } = driverData;
    const result = await pool.query(createQueries.INSERT_DRIVER, [
        name,
        phoneNo,
        email,
        hasAlerts ?? true
    ]);
    return result.rows[0];
};

// 4. Update a driver
export const updateDriver = async (id: number, driverData: UpdateDriverDto) => {
    const existingDriverResult = await pool.query(getQueries.SELECT_DRIVER_BY_ID, [id]);
    if (existingDriverResult.rows.length === 0) {
        return null;
    }
    const existingDriver = existingDriverResult.rows[0];

    const updatedData = {
        name: driverData.name ?? existingDriver.name,
        phoneNo: driverData.phoneNo ?? existingDriver.phoneNo,
        email: driverData.email ?? existingDriver.email,
        hasAlerts: driverData.hasAlerts ?? existingDriver.hasAlerts,
    };

    const result = await pool.query(updateQueries.UPDATE_DRIVER_BY_ID, [
        updatedData.name,
        updatedData.phoneNo,
        updatedData.email,
        updatedData.hasAlerts,
        id
    ]);
    return result.rows[0];
};

// 5. Delete a driver
export const deleteDriver = async (id: number) => {
    const result = await pool.query(deleteQueries.DELETE_DRIVER_BY_ID, [id]);
    if (result.rowCount === 0) {
        return null;
    }
    return { driverId: result.rows[0].driverId, message: 'Driver deleted successfully' };
};

// 6. Get drivers without account
export const getDriversWithoutAccount = async () => {
    const query = `
        SELECT kulj_id as "kuljId", nimi as "name" 
        FROM public.kuljettajat 
        WHERE kulj_id NOT IN (
            SELECT kulj_id FROM public.kayttajat WHERE kulj_id IS NOT NULL
        )
        ORDER BY nimi ASC;
    `;
    const result = await pool.query(query);
    return result.rows;
};

export const fetchAllDrivers = async () => {
    // 1. Get all active drivers
    const result = await pool.query(`SELECT * FROM public.kayttajat WHERE taso = 5 AND aktiivinen = true`);
    const drivers = result.rows;

    const { socketService } = require('./socketService');
    const onlineTokens = socketService.getOnlineIdentifiers();

    const sessionRes = await pool.query(`SELECT user_id, token_identifier FROM public.driver_active_sessions`);
    const dbSessions = sessionRes.rows;

    return drivers.map(d => {
        const activeSessionsForThisDriver = dbSessions.filter(s => Number(s.userId) === Number(d.kuljId));

        const isOnline = activeSessionsForThisDriver.some(s => {
            const token = s.tokenIdentifier || "";
            const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
            return onlineTokens.has(cleanToken);
        });

        return { ...d, isOnline };
    });
};