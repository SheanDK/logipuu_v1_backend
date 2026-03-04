// backend/src/controllers/vehicleController.ts
import { Response, NextFunction } from 'express';
import * as vehicleService from '../services/vehicleService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

// 1. --- GET ALL VEHICLES ---
export const getAllVehiclesHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        console.log(`User ${req.user?.userId} fetching all vehicles.`);
        const vehicles = await vehicleService.getAllVehicles();
        res.status(200).json(vehicles);
    } catch (error) {
        next(error);
    }
};

// 2. --- GET VEHICLE BY ID ---
export const getVehicleByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleId = parseInt(req.params.id as string, 10);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID format." });
        }
        const vehicle = await vehicleService.getVehicleById(vehicleId);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        res.status(200).json(vehicle);
    } catch (error) {
        next(error);
    }
};

// 3. --- CREATE VEHICLE ---
export const createVehicleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleData = req.body as CreateVehicleDto;
        const newVehicle = await vehicleService.createVehicle(vehicleData);
        res.status(201).json(newVehicle);
    } catch (error) {
        next(error);
    }
};

// 4. --- UPDATE VEHICLE ---
export const updateVehicleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleId = parseInt(req.params.id as string, 10);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID format." });
        }
        const vehicleData = req.body as UpdateVehicleDto;
        const updatedVehicle = await vehicleService.updateVehicle(vehicleId, vehicleData);
        if (!updatedVehicle) {
            return res.status(404).json({ message: 'Vehicle not found for update' });
        }
        res.status(200).json(updatedVehicle);
    } catch (error) {
        next(error);
    }
};

// 5. --- DELETE VEHICLE ---
export const deleteVehicleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleId = parseInt(req.params.id as string, 10);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID format." });
        }
        const result = await vehicleService.deleteVehicle(vehicleId);
        if (!result) {
            return res.status(404).json({ message: 'Vehicle not found for deletion' });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// 6. --- CHECK REGISTRATION NO EXISTS ---
export const checkRegistrationNoExistsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { registrationNo, VehicleId } = req.query;


        if (typeof registrationNo !== 'string' || registrationNo.trim() === '') {
            return res.status(400).json({ message: 'Registration number is required for this check.' });
        }

        const existingVehicleId = typeof VehicleId === 'string' ? VehicleId : undefined;

        const exists = await vehicleService.checkRegistrationNoExists(registrationNo, existingVehicleId);
        res.status(200).json({ exists });
    } catch (error) {
        next(error);
    }
};