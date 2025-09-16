// backend/src/controllers/loadController.ts
import { Response, NextFunction } from 'express';
import * as loadService from '../services/loadService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto, CompleteLoadDto, AcceptLoadsDto   } from '../dto/load.dto';

export const getAllLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const filters: loadService.ILoadListFilters = {
            status: req.query.status as 'active' | 'all' | undefined, // <<< Ensure status is extracted
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

// --- THIS IS THE UPDATED HANDLER WITH A SECURITY CHECK ---
export const getLoadByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }

        const load = await loadService.getLoadById(id);
        if (!load) {
            return res.status(404).json({ message: `Resource not found at /api/loads/${id}` });
        }

        // --- SECURITY CHECK ---
        const user = req.user!;
        const isDriver = user.roles.includes('Kuljettaja');

        // If the user is a driver, we must verify they own this load.
        if (isDriver && load.kuljId !== user.driverNumericId) {
            console.warn(`SECURITY ALERT: Driver ${user.driverNumericId} tried to access load ${id} owned by driver ${load.kuljId}.`);
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this specific load." });
        }
        
        // If the user is not a driver, or if they are the correct driver, allow access.
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
        const user = req.user!;
        
        const updatedLoad = await loadService.updateLoad(id, dto, user);
        
        res.status(200).json(updatedLoad);
    } catch (error: any) {
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
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

export const completeLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const loadId = parseInt(req.params.id, 10);
        const dto = req.body as CompleteLoadDto;

        if (isNaN(loadId)) {
            return res.status(400).json({ message: "Invalid Load ID." });
        }
        
        if (!user.driverNumericId) {
            return res.status(403).json({ message: "Forbidden: User is not a driver." });
        }

        const driverId = user.driverNumericId;
        const completedLoad = await loadService.completeLoad(loadId, driverId, dto);
        
        res.status(200).json(completedLoad);
    } catch (error: any) {
        // Handle specific errors from the service
        if (error.message.includes('not found') || error.message.includes('not authorized') || error.message.includes('current status')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

// --- THIS IS THE NEW HANDLER FOR THE DRIVEN/INSPECTION PAGE ---
export const getLoadsForInspectionHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const loads = await loadService.getLoadsForInspection();
        res.status(200).json(loads);
    } catch (error) {
        next(error);
    }
};

export const acceptLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { loadIds } = req.body as AcceptLoadsDto;
        const result = await loadService.acceptLoadsForInvoicing(loadIds);
        res.status(200).json({ message: `${result.count} loads successfully accepted for invoicing.`, ...result });
    } catch (error) {
        next(error);
    }
};

export const getMyCompletedLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user || !user.driverNumericId) {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }
        const driverId = user.driverNumericId;
        const completedLoads = await loadService.getMyCompletedLoadsForList(driverId);
        res.status(200).json(completedLoads);
    } catch (error) {
        next(error);
    }
};

export const getMyLastCompletedLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user || !user.driverNumericId) {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }
        const lastLoad = await loadService.getMyLastCompletedLoad(user.driverNumericId);
        res.status(200).json(lastLoad); // Will return the object or null
    } catch (error) {
        next(error);
    }
};

export const getActiveTripsForMapHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const trips = await loadService.getActiveTripsForMap();
        res.status(200).json(trips);
    } catch (error) {
        next(error);
    }
};