// backend/src/server.ts

import 'reflect-metadata'; 
import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http'; 
import db from './config/db';
import { socketService } from './services/socketService';

// --- Import All Your Routes Here ---
import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import driverRoutes from './routes/driverRoutes';
import timberStackRoutes from './routes/timberStackRoutes';
import drivenInspectionRoutes from './routes/drivenInspectionRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import userRoutes from './routes/userRoutes';
import rolePermissionRoutes from './routes/rolePermissionRoutes'; 
import adminUserRoutes from './routes/adminUserRoutes';
import unloadingSiteRoutes from './routes/unloadingSiteRoutes';
import waybillRoutes from './routes/waybillRoutes';
import puutavaraRoutes from './routes/puutavaraRoutes'; // wood-types
import locationRoutes from './routes/locationRoutes'; // locations
import otherMarkerRoutes from './routes/otherMarkerRoutes'; 
import puutavaralajiRoutes from './routes/timberLogRoutes';
import loadRoutes from './routes/loadRoutes';


import { globalErrorHandler } from './middlewares/errorHandler';
import woodCategoryRoutes from './routes/woodCategoryRoutes';
import driverViewRoutes from './routes/driverViewRoutes';

dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

const httpServer = http.createServer(app);

// Initialize Socket.IO service
socketService.initialize(httpServer, frontendUrl);

// Middlewares
app.use(cors({ origin: frontendUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// --- API Routes ---
// A main router for the /api path for better organization
const apiRouter = express.Router();

// Register all the individual route handlers
apiRouter.use('/auth', authRoutes);       
apiRouter.use('/users', userRoutes);      
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/timber-stacks', timberStackRoutes);
apiRouter.use('/driven-inspection', drivenInspectionRoutes);
apiRouter.use('/dashboards', dashboardRoutes);
apiRouter.use('/role-permissions', rolePermissionRoutes); 
apiRouter.use('/admin/users', adminUserRoutes);
apiRouter.use('/unloading-sites', unloadingSiteRoutes);
apiRouter.use('/waybills', waybillRoutes);
apiRouter.use('/wood-types', puutavaraRoutes);
apiRouter.use('/locations', locationRoutes);
apiRouter.use('/other-markers', otherMarkerRoutes);
apiRouter.use('/timber-logs', puutavaralajiRoutes); 
apiRouter.use('/loads', loadRoutes);
apiRouter.use('/wood-categories', woodCategoryRoutes);

// --- THIS IS THE NEWLY ADDED ROUTE ---
// A dedicated route group for driver-specific views and data
apiRouter.use('/driver', driverViewRoutes);

// Mount the main API router under the /api path
app.use('/api', apiRouter);

// Root path handler
app.get('/', (req: Request, res: Response) => {
    res.send('WoodMaster LogiApp Backend is running!');
});

// 404 Handler for requests that don't match any route
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ message: `Resource not found at ${req.originalUrl}` });
});

// Global error handler (must be the last middleware)
app.use(globalErrorHandler);

const startServer = async () => {
    try {
        // Test the database connection before starting the server
        await db.query('SELECT NOW()');
        console.log("✅ Successfully connected to the database.");

        httpServer.listen(PORT, () => {
            console.log(`✅ Server is running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server.");
        console.error("Database connection failed:", (error as Error).message);
        process.exit(1);
    }
};

startServer();