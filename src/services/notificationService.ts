// backend/src/services/notificationService.ts
import pool from "../config/db";
import { socketService } from "./socketService";

export const notificationService = {
    async sendNotification(recipientUserId: number, type: string, message: string, relatedId?: number | null, vehicleContextId?: number | null) {
        try {
            const query = `
                INSERT INTO public.notifications (recipient_user_id, type, message, related_id, vehicle_context_id)
                VALUES ($1, $2, $3, $4, $5) RETURNING *`;

            const result = await pool.query(query, [
                recipientUserId === 0 ? null : Number(recipientUserId),
                type, message,
                relatedId ? Number(relatedId) : null,
                vehicleContextId ? Number(vehicleContextId) : null
            ]);

            // 🚀 FIX: Pool එක camelCase කරන නිසා 'notificationId' ලෙස භාවිතා කරන්න
            const dbNotif = result.rows[0];
            const actualId = dbNotif.notificationId || dbNotif.notification_id;

            console.log(`✅ Notification saved to DB: ${actualId} for User: ${recipientUserId}`);

            const payload = {
                notificationId: actualId,
                recipientUserId: dbNotif.recipientUserId || dbNotif.recipient_user_id || 0,
                type: dbNotif.type,
                message: dbNotif.message,
                relatedId: dbNotif.relatedId || dbNotif.related_id,
                vehicleContextId: dbNotif.vehicleContextId || dbNotif.vehicle_context_id,
                isRead: dbNotif.isRead || dbNotif.is_read || false,
                createdAt: dbNotif.createdAt || dbNotif.created_at
            };

            const { socketService } = require('./socketService');
            if (recipientUserId === 0) {
                socketService.emitToDispatchers('newNotification', payload);
            } else {
                socketService.emitToUser(recipientUserId, 'newNotification', payload);
            }

            return dbNotif;
        } catch (error) {
            console.error("❌ Notification Error:", error);
            throw error;
        }
    }
};