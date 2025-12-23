// backend/src/controllers/driverViewController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as driverViewService from '../services/driverViewService';
import * as loadService from '../services/loadService'; // Import loadService

export const getMapDataHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user?.driverNumericId;
        if (typeof driverId !== 'number') {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }

        const vehicleIdString = req.query.vehicleId as string;
        const vehicleId = parseInt(vehicleIdString, 10);

        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "Bad Request: A valid 'vehicleId' query parameter is required." });
        }
        
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

        if (req.user?.driverNumericId !== loadData.kuljId) {
            console.warn(`SECURITY ALERT: Driver ${req.user?.driverNumericId} tried to access load ${id} owned by driver ${loadData.kuljId}.`);
            return res.status(403).json({ message: "Forbidden: You are not authorized to view this load." });
        }

        res.status(200).json(loadData);
    } catch (error) {
        next(error);
    }
};

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
        
        const activeTrip = await driverViewService.getActiveTripForDriver(driverId);
        res.status(200).json(activeTrip);

    } catch (error) {
        next(error);
    }
};


export const updateTimberEntryStatusHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const puulaaniId = parseInt(req.params.id, 10);
        const timberEntries = req.body.timberEntries; 

        if (isNaN(puulaaniId) || !Array.isArray(timberEntries)) {
            return res.status(400).json({ message: "Invalid request data." });
        }
        
        await driverViewService.updateTimberEntryStatus(puulaaniId, timberEntries);
        res.status(200).json({ message: 'Statuses updated successfully.' });

    } catch (error) {
        next(error);
    }
};

// --- FIX IS HERE ---
export const getCompletedTripByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user!.driverNumericId!;
        const id = parseInt(req.params.id, 10);

        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid ID format.' });
        }

        const tripDetails = await loadService.getTripByLoadId(id);

        if (!tripDetails) {
            return res.status(404).json({ message: 'Completed trip not found or you are not authorized to view it.' });
        }
        

        res.status(200).json(tripDetails);
    } catch (error) {
        next(error);
    }
};