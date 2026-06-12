// backend/src/controllers/driverViewController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as driverViewService from '../services/driverViewService';
import * as loadService from '../services/loadService';

// GET /api/driver-view/map-data
// Handles fetching map data for a specific driver and vehicle.
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

// GET /api/driver-view/load-for-edit/:id
// Handles fetching a single load for editing by a driver.
export const getLoadForEditHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id as string, 10);
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

// GET /api/driver-view/consignments
// Handles fetching consignments for a specific driver.
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

// GET /api/driver-view/active-trip
// Handles fetching the active trip for a specific driver.
export const getActiveTripHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user?.driverNumericId;
        if (typeof driverId !== 'number') {
            return res.status(403).json({ message: "Forbidden: User is not a valid driver." });
        }

        const vehicleIdString = req.query.vehicleId as string;
        const vehicleId = vehicleIdString ? parseInt(vehicleIdString, 10) : null;
        const validVehicleId = (vehicleId !== null && !isNaN(vehicleId)) ? vehicleId : null;

        const activeTrip = await driverViewService.getActiveTripForDriver(driverId, validVehicleId);
        res.status(200).json(activeTrip);

    } catch (error) {
        next(error);
    }
};

// PATCH /api/driver-view/update-timber-entry-status/:id
// Handles updating the status of timber entries for a specific load.
export const updateTimberEntryStatusHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const puulaaniId = parseInt(req.params.id as string, 10);
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

// GET /api/driver-view/completed-trip/:id
// Handles fetching the completed trip details for a specific load.
export const getCompletedTripByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user!.driverNumericId!;
        const id = parseInt(req.params.id as string, 10);

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