// backend/src/services/notificationService.ts

import pool from "../config/db";
import { socketService } from "./socketService";

export const notificationService = {
    async sendNotification(recipientUserId: number, type: string, message: string, relatedId?: number, vehicleContextId?: number) {
        try {
            const query = `
                INSERT INTO public.notifications (recipient_user_id, type, message, related_id, vehicle_context_id)
                VALUES ($1, $2, $3, $4, $5) RETURNING *`;

            const result = await pool.query(query, [
                recipientUserId === 0 ? null : recipientUserId,
                type,
                message,
                relatedId || null,
                vehicleContextId || null
            ]);

            // Database එකෙන් ලැබෙන raw data එක
            const dbNotif = result.rows[0];

            // 🚀 Frontend එකට ගැළපෙන සේ දත්ත සකස් කිරීම (Mapping)
            const notificationPayload = {
                ...dbNotif,
                notificationId: dbNotif.notification_id,
                recipientUserId: dbNotif.recipient_user_id,
                relatedId: dbNotif.related_id,
                vehicleContextId: dbNotif.vehicle_context_id,
                createdAt: dbNotif.created_at
            };

            if (recipientUserId === 0) {
                socketService.emitToDispatchers('newNotification', notificationPayload);
            } else {
                if (recipientUserId) {
                    socketService.emitToUser(recipientUserId, 'newNotification', notificationPayload);
                }
                // Backup: වාහනයටත් පණිවිඩය යවමු
                if (vehicleContextId) {
                    socketService.emitToVehicle(vehicleContextId, 'newNotification', notificationPayload);
                }
            }

            return dbNotif;
        } catch (error) {
            console.error("Error sending notification:", error);
            throw error;
        }
    }
};