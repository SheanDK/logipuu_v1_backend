// backend/src/controllers/chatController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { chatService } from '../services/chatService';

export const getActiveContacts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.driverNumericId || 0; // Using driverNumericId as general identification
        const data = await chatService.getActiveContacts(userId);
        res.json(data);
    } catch (e) { next(e); }
};

export const getChatHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.driverNumericId || 0;
        const partnerId = Number(req.params.partnerId);
        if (isNaN(partnerId)) {
            return res.status(400).json({ error: "Invalid partner ID format." });
        }

        const data = await chatService.getChatHistory(userId, partnerId);
        await chatService.markAsRead(userId, partnerId);
        res.json(data);
    } catch (e) {
        next(e);
    }
};

export const getBroadcastHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await chatService.getBroadcastHistory();
        res.json(data);
    } catch (e) { next(e); }
};

export const getDriverContacts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const currentDriverId = req.user?.driverNumericId || 0;
        const data = await chatService.getDriverContacts(currentDriverId);
        res.json(data);
    } catch (e) { next(e); }
};

export const deleteMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const senderId = req.user?.driverNumericId || 0; // Support ID is 0
        const { messageIds } = req.body;

        if (!Array.isArray(messageIds)) {
            return res.status(400).json({ error: "Invalid message IDs" });
        }

        const deletedIds = await chatService.softDeleteMessages(messageIds, senderId);
        res.json({ success: true, deletedIds });
    } catch (e) { next(e); }
};