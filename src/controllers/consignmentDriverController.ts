// backend/src/controllers/consignmentDriverController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as consignmentDriverService from '../services/consignmentDriverService';

// Handles GET /api/driver/consignments
export const getAllConsignmentsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user!.driverNumericId!;
        const vehicleId = parseInt(req.query.vehicleId as string, 10);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "A valid 'vehicleId' query parameter is required." });
        }
        const data = await consignmentDriverService.getConsignmentsForDriver(driverId, vehicleId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// Handles GET /api/driver/consignments/:id
export const getConsignmentByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) { return res.status(400).json({ message: "Invalid ID format." }); }
        const driverId = req.user!.driverNumericId!;
        const data: any | null = await consignmentDriverService.getConsignmentById(id, driverId);
        if (!data) {
            return res.status(404).json({ message: 'Consignment not found or access denied.' });
        }
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// Handles POST /api/driver/consignments
export const createConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // --- FINAL DEBUGGING STEP ---
        // Log the raw request body as soon as it arrives at the controller.
        console.log('--- RAW req.body RECEIVED BY CONTROLLER ---', JSON.stringify(req.body, null, 2));

        const driverId = req.user!.driverNumericId!;
        const { vehicleId, ...consignmentData } = req.body;
        const vehicleIdNum = parseInt(vehicleId, 10);

        if (isNaN(vehicleIdNum)) {
            return res.status(400).json({ message: "A valid 'vehicleId' is required in the request body." });
        }

        const data = await consignmentDriverService.createConsignment(consignmentData, driverId, vehicleIdNum);

        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

// Handles PUT /api/driver/consignments/:id
export const updateConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) { return res.status(400).json({ message: "Invalid ID format." });}
        const driverId = req.user!.driverNumericId!;
        
        const data = await consignmentDriverService.updateConsignment(id, req.body, driverId);
        res.status(200).json(data);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        next(error);
    }
};