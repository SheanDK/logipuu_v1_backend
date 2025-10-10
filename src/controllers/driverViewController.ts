// backend/src/controllers/driverViewController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as driverViewService from '../services/driverViewService';

export const getMapDataHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Ensure the user is a driver and has a numeric ID
        const driverId = req.user?.driverNumericId;
        if (typeof driverId !== 'number') {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }

        // --- THIS IS THE CHANGE ---
        // Get vehicleId from the query parameters
        const vehicleIdString = req.query.vehicleId as string;
        const vehicleId = parseInt(vehicleIdString, 10);

        // Validate that vehicleId was provided and is a valid number
        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "Bad Request: A valid 'vehicleId' query parameter is required." });
        }
        
        // Pass both IDs to the service function
        const mapData = await driverViewService.getMapDataForDriver(driverId, vehicleId);
        res.status(200).json(mapData);

    } catch (error) {
        next(error);
    }
};

export const getLoadForEditHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid Load ID." });
        
        const loadData = await driverViewService.getSingleLoadForEdit(id);
        if (!loadData) return res.status(404).json({ message: "Load not found." });

        // Security Check: Ensure the driver requesting the data is the one who owns the load.
        if (req.user?.driverNumericId !== loadData.kuljId) {
            console.warn(`SECURITY ALERT: Driver ${req.user?.driverNumericId} tried to access load ${id} owned by driver ${loadData.kuljId}.`);
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this load." });
        }

        res.status(200).json(loadData);
    } catch (error) {
        next(error);
    }
};

// --- THIS IS THE NEW HANDLER ---
export const getConsignmentsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user?.driverNumericId;
        if (typeof driverId !== 'number') {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }
        
        const consignments = await driverViewService.getConsignmentsForDriver(driverId);
        res.status(200).json(consignments);

    } catch (error) {
        next(error);
    }
};

export const getActiveTripHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user?.driverNumericId;
        if (typeof driverId !== 'number') {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }
        
        // Call the service function to get the single active trip
        const activeTrip = await driverViewService.getActiveTripForDriver(driverId);

        // It's okay if it's null (no active trip), the frontend will handle it.
        res.status(200).json(activeTrip);

    } catch (error) {
        next(error);
    }
};


export const updateTimberEntryStatusHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const puulaaniId = parseInt(req.params.id, 10);
        const timberEntries = req.body.timberEntries; // Expecting an array like [{ puutavaraId: 1, valmis: true }]

        if (isNaN(puulaaniId) || !Array.isArray(timberEntries)) {
            return res.status(400).json({ message: "Invalid request data." });
        }
        
        await driverViewService.updateTimberEntryStatus(puulaaniId, timberEntries);
        res.status(200).json({ message: 'Statuses updated successfully.' });

    } catch (error) {
        next(error);
    }
};