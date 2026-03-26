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
            const notification = result.rows[0];

            if (recipientUserId === 0) {
                socketService.emitToDispatchers('newNotification', notification);
            } else {
                if (recipientUserId !== null && recipientUserId !== undefined) {
                    socketService.emitToUser(recipientUserId, 'newNotification', notification);
                }
                if (vehicleContextId) {
                    socketService.emitToVehicle(vehicleContextId, 'newNotification', notification);
                }
            }

            return notification;
        } catch (error) {
            console.error("Error sending notification:", error);
            throw error;
        }
    }
};