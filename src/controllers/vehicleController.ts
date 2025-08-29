// backend/src/controllers/vehicleController.ts
import { Response, NextFunction } from 'express';
import * as vehicleService from '../services/vehicleService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware'; // req.user access 
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto'; // Typed req.body

export const getAllVehiclesHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        console.log(`User ${req.user?.userId} fetching all vehicles.`);
        const vehicles = await vehicleService.getAllVehicles();
        res.status(200).json(vehicles);
    } catch (error) {
        next(error); //Pass Global error handler 
    }
};

export const getVehicleByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleId = parseInt(req.params.id, 10);
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

export const createVehicleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // req.body  CreateVehicleDto type coming from validationMiddleware 
        const vehicleData = req.body as CreateVehicleDto;
        const newVehicle = await vehicleService.createVehicle(vehicleData);
        res.status(201).json(newVehicle);
    } catch (error) {
        // Database unique constraint errors
        // if (error.code === '23505') { // PostgreSQL unique violation code
        //     return res.status(409).json({ message: 'Vehicle with this registration number already exists.' });
        // }
        next(error);
    }
};

export const updateVehicleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleId = parseInt(req.params.id, 10);
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

export const deleteVehicleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const vehicleId = parseInt(req.params.id, 10);
        if (isNaN(vehicleId)) {
            return res.status(400).json({ message: "Invalid vehicle ID format." });
        }
        const result = await vehicleService.deleteVehicle(vehicleId);
        if (!result) {
            return res.status(404).json({ message: 'Vehicle not found for deletion' });
        }
        res.status(200).json(result); // or res.status(204).send(); for no content
    } catch (error) {
        next(error);
    }
};

// --- KEY CORRECTION IS HERE ---
export const checkRegistrationNoExistsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // req.query now has the correct type because req is AuthenticatedRequest.
        const { registrationNo, VehicleId } = req.query; 
        
        // Ensure registrationNo is a string
        if (typeof registrationNo !== 'string' || registrationNo.trim() === '') {
            return res.status(400).json({ message: 'Registration number is required for this check.' });
        }

        // VehicleId might be a string or undefined.
        const existingVehicleId = typeof VehicleId === 'string' ? VehicleId : undefined;

        const exists = await vehicleService.checkRegistrationNoExists(registrationNo, existingVehicleId);
        res.status(200).json({ exists });
    } catch (error) {
        next(error); // Pass to global error handler
    }
};