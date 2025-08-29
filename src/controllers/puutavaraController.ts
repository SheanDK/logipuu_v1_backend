// backend/src/controllers/puutavaraController.ts
import { Request, Response, NextFunction } from 'express';
import * as service from '../services/puutavaraService';

export const getAllHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await service.getAllWoodTypes();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};