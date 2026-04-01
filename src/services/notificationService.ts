// backend/src/services/notificationService.ts
import pool from "../config/db";

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

            const dbNotif = result.rows[0];

            // 🚀 🚀 🚀 FIX: Frontend එකට අවශ්‍ය CamelCase Payload එක සහතික කිරීම 🚀 🚀 🚀
            const notificationPayload = {
                notificationId: dbNotif.notification_id,
                recipientUserId: dbNotif.recipient_user_id,
                type: dbNotif.type,
                message: dbNotif.message,
                relatedId: dbNotif.related_id,
                vehicleContextId: dbNotif.vehicle_context_id,
                createdAt: dbNotif.created_at,
                isRead: false
            };

            const { socketService } = require('./socketService');

            if (recipientUserId === 0) {
                // කාර්යාලයට යැවීම
                socketService.emitToDispatchers('newNotification', notificationPayload);
            } else {
                // 🚀 රියදුරුගේ පුද්ගලික User Room එකට පණිවිඩය යැවීම
                console.log(`📡 Sending Socket Notification to user_${recipientUserId}`);
                socketService.emitToUser(recipientUserId, 'newNotification', notificationPayload);

                // Backup සඳහා වාහනයටත් යවමු
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