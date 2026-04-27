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
        const sessionRes = await pool.query(
            `SELECT user_id as "userId", token_identifier as "tokenIdentifier" FROM public.driver_active_sessions WHERE session_id = $1`,
            [sessionId]
        );

        if (sessionRes.rows.length === 0) return { success: false };

        // 🚀 FIX: Pool එක camelCase කරන නිසා userId සහ tokenIdentifier ලෙස ලබා ගත යුතුය
        const { userId, tokenIdentifier } = sessionRes.rows[0];

        await pool.query(`DELETE FROM public.driver_active_sessions WHERE session_id = $1`, [sessionId]);

        const remainingRes = await pool.query(
            `SELECT count(*) FROM public.driver_active_sessions WHERE user_id = $1`,
            [userId]
        );

        const isLastSession = parseInt(remainingRes.rows[0].count) === 0;

        if (isLastSession) {
            await pool.query(
                `UPDATE public.kayttajat SET current_vehicle_id = NULL WHERE kulj_id = $1`,
                [userId]
            );
        }

        return {
            success: true,
            userId: userId, // දැන් මෙය නිවැරදිව ලැබෙනු ඇත
            isLastSession,
            tokenIdentifier: tokenIdentifier
        };
    }
};