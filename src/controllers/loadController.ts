// backend/src/controllers/loadController.ts
import { Response, NextFunction } from 'express';
import * as loadService from '../services/loadService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateLoadDto, UpdateLoadDto, } from '../dto/load.dto';

export const getAllLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Extract filter parameters from the request query string
        const filters: loadService.ILoadListFilters = {
            asiakasId: req.query.asiakasId as string | undefined,
            kalustoNro: req.query.kalustoNro as string | undefined,
            kuljId: req.query.kuljId as string | undefined,
        };
        
        const loads = await loadService.getAllLoadsForList(filters);
        res.status(200).json(loads);
    } catch (error) {
        next(error);
    }
};

export const getLoadByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }
        const load = await loadService.getLoadById(id);
        if (!load) {
            // Send a clear "Resource not found" message
            return res.status(404).json({ message: `Resource not found at /api/loads/${id}` });
        }
        res.status(200).json(load);
    } catch (error) {
        next(error);
    }
};

export const createLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as CreateLoadDto;
        const newLoad = await loadService.createLoad(dto);
        res.status(201).json(newLoad);
    } catch (error) {
        next(error);
    }
};

export const updateLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }

        const dto = req.body as UpdateLoadDto;
        const updatedLoad = await loadService.updateLoad(id, dto);
        res.status(200).json(updatedLoad);
    } catch (error: any) {
        // Handle "Load not found" error from service specifically
        if (error.message === 'Load not found.') {
            return res.status(404).json({ message: error.message });
        }
        next(error); // Pass other errors to the global handler
    }
};

export const deleteLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }

        const result = await loadService.deleteLoad(id);
        if (!result) {
            return res.status(404).json({ message: 'Load not found for deletion' });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};