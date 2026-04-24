// backend/src/services/sessionService.ts
import pool from '../config/db';

export const sessionService = {
    // 1. Check if vehicle is used by another driver
    async getVehicleOccupant(vehicleId: number, userId: number) {
        const query = `
            SELECT u.nimi, u.tunnus 
            FROM public.driver_active_sessions s
            JOIN public.kayttajat u ON s.user_id = u.kulj_id
            WHERE s.vehicle_id = $1 AND s.user_id != $2
            LIMIT 1`;
        const res = await pool.query(query, [vehicleId, userId]);
        return res.rows[0];
    },

    // 2. live sessions for office
    async getAllActiveSessions(userId?: number) {

        const { socketService } = require('./socketService');
        const onlineIdentifiers = socketService.getOnlineIdentifiers(); // get online identifiers

        let query = `
            SELECT s.session_id, u.nimi as driver_name, k.rek_nro, s.device_info, 
                   s.token_identifier, s.created_at
            FROM public.driver_active_sessions s
            JOIN public.kayttajat u ON s.user_id = u.kulj_id
            JOIN public.kalusto k ON s.vehicle_id = k.kalusto_nro
        `;

        const params: any[] = [];
        if (userId) {
            query += ` WHERE s.user_id = $1`;
            params.push(userId);
        }

        const res = await pool.query(query, params);

        // check if each session is online or not
        return res.rows.map(row => ({
            ...row,
            isOnline: onlineIdentifiers.has(row.token_identifier)
        }));
    },

    // 3. Force Release (office)
    async forceRelease(sessionId: number) {
        // 1. get user id and token identifier of the session to be released
        const sessionRes = await pool.query(
            `SELECT user_id, token_identifier FROM public.driver_active_sessions WHERE session_id = $1`,
            [sessionId]
        );

        if (sessionRes.rows.length === 0) return { success: false };

        const { user_id, token_identifier } = sessionRes.rows[0];

        // 2. delete that specific session
        await pool.query(`DELETE FROM public.driver_active_sessions WHERE session_id = $1`, [sessionId]);

        // 3. check if the driver has any other active sessions
        const remainingRes = await pool.query(
            `SELECT count(*) FROM public.driver_active_sessions WHERE user_id = $1`,
            [user_id]
        );

        const isLastSession = parseInt(remainingRes.rows[0].count) === 0;

        // 4. release vehicle only if all sessions are ended
        if (isLastSession) {
            await pool.query(
                `UPDATE public.kayttajat SET current_vehicle_id = NULL WHERE kulj_id = $1`,
                [user_id]
            );
        }

        return {
            success: true,
            userId: user_id,
            tokenIdentifier: token_identifier,
            isLastSession: isLastSession
        };
    }
};