// backend/src/controllers/loadController.ts
import { Response, NextFunction } from 'express';
import * as loadService from '../services/loadService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto,  } from '../dto/load.dto';

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

// --- THIS IS THE NEW HANDLER FOR THE DRIVER'S PORTAL ---
export const getMyLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        
        console.log("--- USER OBJECT RECEIVED IN getMyLoadsHandler ---", user);

        // --- NEW, SIMPLER VALIDATION ---
        // We check if driverNumericId is "falsy" (null, undefined, 0).
        // Since a driver ID of 0 is unlikely, this is a safe and robust check.
        if (!user || !user.driverNumericId) {
            console.error("!!! AUTHORIZATION FAILED in controller: driverNumericId is missing or falsy.", user);
            return res.status(403).json({ message: "Forbidden: User is not associated with a valid driver ID." });
        }

        const driverId = user.driverNumericId;
        const myLoads = await loadService.getMyLoadsForList(driverId);
        res.status(200).json(myLoads);
    } catch (error) {
        next(error);
    }
};

// --- THIS IS THE NEW HANDLER FOR STATUS UPDATES ---
export const updateLoadStatusHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        const loadId = parseInt(req.params.id, 10);
        const { status } = req.body as UpdateLoadStatusDto;

        if (isNaN(loadId)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }
        
        if (!user || !user.driverNumericId) {
            return res.status(403).json({ message: "Forbidden: User is not a driver." });
        }

        const driverId = user.driverNumericId;
        const updatedLoad = await loadService.updateLoadStatus(loadId, status, driverId);
        
        res.status(200).json(updatedLoad);
    } catch (error: any) {
        // Handle specific "not found or not authorized" error from service
        if (error.message.includes('not found or you are not authorized')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};