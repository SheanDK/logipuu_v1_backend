// backend/src/controllers/timberLogController.ts
import { Response, NextFunction } from 'express';
// --- THIS IS THE FIX ---
// Changed the import from the non-existent 'woodspeciesService' to the correct 'timberLogService'.
import * as puutavaralajiService from '../services/timberLogService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

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