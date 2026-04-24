// backend/src/controllers/sessionController.ts
import { Request, Response } from 'express';
import { sessionService } from '../services/sessionService';

// 1. get all active driver sessions
export const getActiveSessions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        const sessions = await sessionService.getAllActiveSessions(userId ? Number(userId) : undefined);

        res.status(200).json(sessions);
    } catch (error) {
        console.error("getActiveSessions Error:", error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};


// 2. force release a session for office users
export const forceReleaseSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await sessionService.forceRelease(Number(id));

        if (result.success) {
            const { socketService } = require('../services/socketService');
            socketService.emitToUser(result.userId, 'emergencyLogout', {
                tokenIdentifier: result.tokenIdentifier,
                message: "Your session has been terminated by the office management. You are being logged out."
            });

            socketService.emitToDispatchers('driverStatusChanged', { userId: result.userId, status: 'offline' });
            res.status(200).json({ success: true });
        }
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
};