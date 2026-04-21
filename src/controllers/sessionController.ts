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

            socketService.emitToUser(result.userId, 'sessionTerminated', {
                isLastSession: result.isLastSession,
                terminatedToken: result.tokenIdentifier
            });

            socketService.emit('chipLoadUpdated', { action: 'SESSION_RELEASED' });

            res.status(200).json({ message: 'Device disconnected successfully' });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to release session' });
    }
};