// backend/src/controllers/dashboardController.ts
import { Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

export const getAdminDashboardHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // Optional: Log which admin/user is accessing
        console.log(`User ${req.user?.userId} (Role: ${req.user?.roles.join(', ')}) accessing Admin Dashboard.`);
        const data = await dashboardService.getAdminDashboardData();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getDispatchDashboardHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        console.log(`User ${req.user?.userId} (Role: ${req.user?.roles.join(', ')}) accessing Dispatch Dashboard.`);
        const data = await dashboardService.getDispatchDashboardData();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

export const getDriverDashboardHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // --- FIX: Use 'driverNumericId' from the user object ---
        const driverId = req.user?.driverNumericId; 

        if (!driverId) {
            return res.status(400).json({ message: "Driver ID not found in user token." });
        }
        
        // driverId is already a number, no need for parseInt
        console.log(`Driver ${driverId} accessing Driver Dashboard.`);
        const data = await dashboardService.getDriverDashboardData(driverId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// --- NEW HANDLER 1: Volume Chart  ---
export const getVolumeByDayHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await dashboardService.getVolumeLast7Days();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// --- NEW HANDLER 2: Active Trips List  ---
export const getActiveTripsListHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const list = await dashboardService.getActiveTripsList();
        res.status(200).json(list);
    } catch (error) {
        next(error);
    }
};

export const getCustomerDashboardHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const customerId = parseInt(req.params.id, 10);
        if (isNaN(customerId)) return res.status(400).json({ message: "Invalid Customer ID" });
        
        const data = await dashboardService.getCustomerDashboardData(customerId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};