// backend/src/controllers/timberLogController.ts
import { Response, NextFunction } from 'express';
import * as puutavaralajiService from '../services/timberLogService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// 1. --- GET TIMBER LOGS FOR STACK ---
export const getTimberLogsForStackHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const puulaaniId = parseInt(req.params.puulaaniId as string, 10);
        if (isNaN(puulaaniId)) {
            return res.status(400).json({ message: "Invalid Puulaani ID format." });
        }
        const logs = await puutavaralajiService.getTimberLogsForStack(puulaaniId);
        res.status(200).json(logs);
    } catch (error) {
        next(error);
    }
};