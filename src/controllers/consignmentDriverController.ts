// backend/src/controllers/consignmentDriverController.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import * as consignmentDriverService from '../services/consignmentDriverService';
import { CreateConsignmentDto } from '../dto/consignment.dto';
import { validate } from 'class-validator';

// Handles GET /api/driver/consignments
export const getAllConsignmentsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = req.user!.driverNumericId!;
        const data = await consignmentDriverService.getConsignmentsForDriver(driverId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// Handles GET /api/driver/consignments/:id
export const getConsignmentByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        const driverId = req.user!.driverNumericId!;
        const data = await consignmentDriverService.getConsignmentById(id, driverId);
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
    // Basic validation, assuming a validation middleware would handle DTOs
    try {
        const driverId = req.user!.driverNumericId!;
        const vehicleId = parseInt(req.body.vehicleId, 10); // Assuming vehicleId is sent in body
        
        const data = await consignmentDriverService.createConsignment(req.body, driverId, vehicleId);
        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

// Handles PUT /api/driver/consignments/:id
export const updateConsignmentHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        const driverId = req.user!.driverNumericId!;
        
        const data = await consignmentDriverService.updateConsignment(id, req.body, driverId);
        res.status(200).json(data);
    } catch (error) {
        if (error instanceof Error && error.message === 'Forbidden') {
            return res.status(403).json({ message: 'Access denied.' });
        }
        next(error);
    }
};