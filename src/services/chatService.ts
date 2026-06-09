// backend/src/services/chatService.ts
import pool from '../config/db';

export const chatService = {
    // 1. Fetch active driver contacts for Office Side
    getActiveContacts: async (officeUserId: number) => {
        const query = `
            WITH last_messages AS (
                SELECT DISTINCT ON (partner_id)
                    partner_id,
                    message_text,
                    created_at,
                    vehicle_number
                FROM (
                    SELECT 
                        CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS partner_id,
                        message_text,
                        created_at,
                        vehicle_number
                    FROM public.chat_messages
                    WHERE sender_id = $1 OR recipient_id = $1
                ) sub
                ORDER BY partner_id, created_at DESC
            ),
            unread_counts AS (
                SELECT sender_id, COUNT(*) AS count
                FROM public.chat_messages
                WHERE recipient_id = $1 AND is_read = false
                GROUP BY sender_id
            )
            SELECT 
                k.kulj_id AS "driverId",
                k.nimi AS "driverName",
                k.tunnus AS "username",
                COALESCE(
                    (SELECT s.vehicle_id FROM public.driver_active_sessions s WHERE s.user_id = k.kulj_id LIMIT 1),
                    lm.vehicle_number
                ) AS "vehicleNumber",
                kl.rek_nro AS "vehicleRegNo",
                lm.message_text AS "lastMessage",
                lm.created_at AS "lastMessageTime",
                COALESCE(uc.count, 0) AS "unreadCount",
                EXISTS(SELECT 1 FROM public.driver_active_sessions s WHERE s.user_id = k.kulj_id) AS "isOnline"
            FROM public.kayttajat k
            JOIN public.kuljettajat ku ON k.kulj_id = ku.kulj_id
            LEFT JOIN last_messages lm ON k.kulj_id = lm.partner_id
            LEFT JOIN unread_counts uc ON k.kulj_id = uc.sender_id
            LEFT JOIN public.kalusto kl ON COALESCE(
                (SELECT s.vehicle_id FROM public.driver_active_sessions s WHERE s.user_id = k.kulj_id LIMIT 1),
                lm.vehicle_number
            ) = kl.kalusto_nro
            WHERE k.kulj_id IS NOT NULL
            ORDER BY COALESCE(lm.created_at, '1970-01-01'::timestamp) DESC;
        `;
        const res = await pool.query(query, [officeUserId]);
        return res.rows;
    },

    // 2. Fetch single chat history including is_deleted state
    getChatHistory: async (userId: number, partnerId: number) => {
        const driverId = userId === 0 ? partnerId : userId;
        const query = `
            SELECT 
                cm.*,
                COALESCE(cm.is_broadcast, false) AS "isBroadcast",
                COALESCE(cm.is_deleted, false) AS "isDeleted" -- 🚀 NEW: Select is_deleted state
            FROM public.chat_messages cm
            WHERE (cm.sender_id = $1 AND cm.recipient_id = $2)
               OR (cm.sender_id = $2 AND cm.recipient_id = $1)
               OR (cm.sender_id = -1 AND cm.recipient_id = $3)
            ORDER BY cm.created_at ASC;
        `;
        const res = await pool.query(query, [userId, partnerId, driverId]);
        return res.rows;
    },

    // 3. softDeleteMessages
    softDeleteMessages: async (messageIds: number[], senderId: number) => {
        if (!messageIds || messageIds.length === 0) return [];

        const query = `
        UPDATE public.chat_messages
        SET is_deleted = true, message_text = 'Message deleted'
        WHERE message_id = ANY($1::int[]) 
        AND sender_id = $2
        RETURNING message_id AS "deletedId";
    `;

        const res = await pool.query(query, [messageIds, senderId]);

        // Explicit alias + filter nulls
        const deletedIds = res.rows
            .map(r => r.deletedId ?? r.message_id ?? r.messageId)
            .filter((id): id is number => id !== null && id !== undefined);

        console.log('[chatService] softDelete rows:', res.rows, '→ ids:', deletedIds);
        return deletedIds;
    },

    // 4. Save single message
    saveMessage: async (senderId: number, recipientId: number, vehicleNumber: number | null, text: string, isBroadcast: boolean = false) => {
        const query = `
        INSERT INTO public.chat_messages (sender_id, recipient_id, vehicle_number, message_text, is_broadcast, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *;
    `;
        const res = await pool.query(query, [senderId, recipientId, vehicleNumber, text, isBroadcast]);
        return res.rows[0];
    },

    // 5. Mark messages as read
    markAsRead: async (userId: number, partnerId: number) => {
        const query = `
            UPDATE public.chat_messages 
            SET is_read = true 
            WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false;
        `;
        await pool.query(query, [userId, partnerId]);
    },

    // 6. Fetch aggregated broadcast history for Office Side
    getBroadcastHistory: async () => {
        const query = `
        SELECT 
            cm.message_text AS "messageText",
            date_trunc('minute', cm.created_at) AS "createdAt",
            COUNT(cm.recipient_id) AS "recipientCount",
            string_agg(ku.nimi, ', ') AS "recipientNames",
            -- Delete tracking සඳහා message ids collect කරනවා
            array_agg(cm.message_id) AS "messageIds",
            -- Whole group deleted නම් track කරනවා
            bool_and(COALESCE(cm.is_deleted, false)) AS "isDeleted"
        FROM public.chat_messages cm
        JOIN public.kuljettajat ku ON cm.recipient_id = ku.kulj_id
        WHERE cm.sender_id = 0
        GROUP BY cm.message_text, date_trunc('minute', cm.created_at)
        HAVING COUNT(cm.recipient_id) > 1 
        ORDER BY "createdAt" DESC;
    `;
        const res = await pool.query(query);
        return res.rows;
    },


    // 7. Fetch other online drivers with EXISTS to prevent duplicate active session rows [1]
    getDriverContacts: async (currentDriverId: number) => {
        const query = `
            SELECT 
                ku.kulj_id AS "driverId",
                ku.nimi AS "driverName",
                COALESCE(
                    (SELECT s.vehicle_id FROM public.driver_active_sessions s WHERE s.user_id = ku.kulj_id LIMIT 1),
                    (SELECT vehicle_number FROM public.chat_messages WHERE (sender_id = ku.kulj_id OR recipient_id = ku.kulj_id) ORDER BY created_at DESC LIMIT 1)
                ) AS "vehicleNumber",
                kl.rek_nro AS "vehicleRegNo",
                EXISTS(SELECT 1 FROM public.driver_active_sessions s WHERE s.user_id = ku.kulj_id) AS "isOnline"
            FROM public.kuljettajat ku
            LEFT JOIN public.kalusto kl ON COALESCE(
                (SELECT s.vehicle_id FROM public.driver_active_sessions s WHERE s.user_id = ku.kulj_id LIMIT 1),
                (SELECT vehicle_number FROM public.chat_messages WHERE (sender_id = ku.kulj_id OR recipient_id = ku.kulj_id) ORDER BY created_at DESC LIMIT 1)
            ) = kl.kalusto_nro
            WHERE ku.kulj_id != $1
            ORDER BY EXISTS(SELECT 1 FROM public.driver_active_sessions s WHERE s.user_id = ku.kulj_id) DESC, ku.nimi ASC;
        `;
        const res = await pool.query(query, [currentDriverId]);
        return res.rows;
    }
};