// backend/src/controllers/loadController.ts
import { Response, NextFunction } from 'express';
import * as loadService from '../services/loadService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto, CompleteLoadDto, AcceptLoadsDto, CreateBulkLoadDto } from '../dto/load.dto';

export const getAllLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const filters: loadService.ILoadListFilters = {
            status: req.query.status as 'active' | 'all' | undefined,
            asiakasId: req.query.asiakasId as string | undefined,
            kalustoNro: req.query.kalustoNro as string | undefined,
            kuljId: req.query.kuljId as string | undefined,
            loadType: req.query.loadType !== undefined ? parseInt(req.query.loadType as string, 10) : undefined,
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
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }

        console.log(`[Controller] getLoadByIdHandler called for ID: ${id}. Now calling getTripByLoadId...`);

        const trip = await loadService.getTripByLoadId(id);

        if (!trip) {
            return res.status(404).json({ message: `Trip details could not be found for load ID ${id}` });
        }

        // Security check for driver role
        const user = req.user!;
        const isDriver = user.roles.includes('Kuljettaja');
        if (isDriver && trip.legs[0].kuljId !== user.driverNumericId) {
            console.warn(`SECURITY ALERT: Driver ${user.driverNumericId} tried to access a trip owned by another driver.`);
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this trip." });
        }
        console.log(`[Controller] Successfully fetched trip data. Sending response to client...`);

        res.status(200).json(trip);

    } catch (error) {
        console.error(`[Controller] ERROR in getLoadByIdHandler:`, error);
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
        const id = parseInt(req.params.id as string, 10);
        const dto = req.body as UpdateLoadDto;
        const user = req.user!;

        console.log(`[CONTROLLER DEBUG] updateLoadHandler request:`, { id, body: req.body, user: { id: user.id, driverId: user.driverNumericId } });

        if (isNaN(id)) {
            console.error(`[CONTROLLER DEBUG] Invalid Load ID format: ${req.params.id}`);
            return res.status(400).json({ message: "Invalid Load ID format." });
        }

        const updatedLoad = await loadService.updateLoad(id, dto, user);
        res.status(200).json(updatedLoad);

    } catch (error: any) {
        console.error(`[CONTROLLER DEBUG] updateLoadHandler Error:`, error.message);
        if (error.message.includes('not found') || error.message.includes('not authorized')) {
            return res.status(403).json({ message: error.message });
        }
        next(error);
    }
};

export const deleteLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid Load ID format." });
        }

        const result = await loadService.deleteLoad(id, req.user!);
        if (!result) {
            return res.status(404).json({ message: 'Load not found for deletion' });
        }
        res.status(200).json(result);
    } catch (error) {
        if (error instanceof Error && (error.message.includes('Forbidden') || error.message.includes('Cannot delete'))) {
            return res.status(403).json({ message: error.message });
        }
        next(error);
    }
};

// --- THIS IS THE NEW HANDLER FOR THE DRIVER'S PORTAL ---
export const getMyLoadsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;

        console.log("--- USER OBJECT RECEIVED IN getMyLoadsHandler ---", user);
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
        const loadId = parseInt(req.params.id as string, 10);
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
        if (error.message.includes('not found or you are not authorized')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};

export const completeLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const loadId = parseInt(req.params.id as string, 10);
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
        res.status(200).json(lastLoad);
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

export const updateTripHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { initialLoadId } = req.params;
        const tripData = req.body;

        if (!user.driverNumericId) {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }

        const updatedTrip = await loadService.updateTripByLoadId(
            parseInt(initialLoadId as string, 10),
            tripData,
            user.driverNumericId
        );

        res.status(200).json(updatedTrip);

    } catch (error: any) {
        if (error.message.includes('not found') || error.message.includes('not in Assigned state') || error.message.includes('not authorized')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

// --- NEW HANDLER ---

export const createBulkLoadHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const dto = req.body as CreateBulkLoadDto;
        const user = req.user!;

        // Additional check: Ensure the driver creating the loads is themselves
        if (user.roles.includes('Kuljettaja')) {
            for (const leg of dto.legs) {
                if (leg.kuljId !== user.driverNumericId) {
                    return res.status(403).json({ message: "Forbidden: You can only create loads for yourself." });
                }
            }
        }

        const result = await loadService.createBulkLoad(dto, user);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateTripStatusHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user!;
        const { ajomaaraysNro } = req.params;
        const { status } = req.body as UpdateLoadStatusDto;

        if (!user.driverNumericId) {
            return res.status(403).json({ message: "Forbidden: User is not a driver." });
        }
        if (!ajomaaraysNro) {
            return res.status(400).json({ message: "Driving Order Number is required." });
        }

        const result = await loadService.updateTripStatus(ajomaaraysNro as string, status, user.driverNumericId);
        res.status(200).json({ message: `Trip status updated to '${status}'.`, ...result });
    } catch (error) {
        next(error);
    }
};