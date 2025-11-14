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
        // Taking the login Driver ID using req.user
        const driverId = req.user?.userId; // Assuming userId from token is the driver's identifier in kuljettajat.KuljID (needs to be number)
                                         

        if (!driverId) {
            return res.status(400).json({ message: "Driver identification not found in token." });
        }
        
       
        // For now, if req.user.userId is the string version of KuljID:
        const numericDriverId = parseInt(driverId, 10);
        if (isNaN(numericDriverId)) {
             return res.status(400).json({ message: "Invalid driver ID format in token." });
        }

        console.log(`Driver ${numericDriverId} accessing Driver Dashboard.`);
        const data = await dashboardService.getDriverDashboardData(numericDriverId);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// --- NEW HANDLER 1: Volume Chart සඳහා ---
export const getVolumeByDayHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await dashboardService.getVolumeLast7Days();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// --- NEW HANDLER 2: Active Trips List සඳහා ---
export const getActiveTripsListHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const list = await dashboardService.getActiveTripsList();
        res.status(200).json(list);
    } catch (error) {
        next(error);
    }
};