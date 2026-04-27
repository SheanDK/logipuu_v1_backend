// backend/src/controllers/driverController.ts
import { Response, NextFunction, Request } from 'express';
import * as driverService from '../services/driverService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { CreateDriverDto, UpdateDriverDto } from '../dto/driver.dto';

// 1. Get All Drivers
export const getAllDriversHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        console.log(`User ${req.user?.userId} fetching all drivers.`);
        const drivers = await driverService.fetchAllDrivers();
        res.status(200).json(drivers);
    } catch (error) {
        next(error);
    }
};

// 2. Get Driver By ID
export const getDriverByIdHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = parseInt(req.params.id as string, 10);
        if (isNaN(driverId)) {
            return res.status(400).json({ message: "Invalid driver ID format." });
        }
        const driver = await driverService.getDriverById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }
        res.status(200).json(driver);
    } catch (error) {
        next(error);
    }
};

// 3. Create Driver
export const createDriverHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverData = req.body as CreateDriverDto;
        const newDriver = await driverService.createDriver(driverData);
        res.status(201).json(newDriver);
    } catch (error) {
        next(error);
    }
};

// 4. Update Driver
export const updateDriverHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = parseInt(req.params.id as string, 10);
        if (isNaN(driverId)) {
            return res.status(400).json({ message: "Invalid driver ID format." });
        }
        const driverData = req.body as UpdateDriverDto;
        const updatedDriver = await driverService.updateDriver(driverId, driverData);
        if (!updatedDriver) {
            return res.status(404).json({ message: 'Driver not found for update' });
        }
        res.status(200).json(updatedDriver);
    } catch (error) {
        next(error);
    }
};

// 5. Delete Driver
export const deleteDriverHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const driverId = parseInt(req.params.id as string, 10);
        if (isNaN(driverId)) {
            return res.status(400).json({ message: "Invalid driver ID format." });
        }
        const result = await driverService.deleteDriver(driverId);
        if (!result) {
            return res.status(404).json({ message: 'Driver not found for deletion' });
        }
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// 6. Get Drivers Without Account
export const getDriversWithoutAccountHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const drivers = await driverService.getDriversWithoutAccount();
        res.status(200).json(drivers);
    } catch (error) {
        next(error);
    }
};