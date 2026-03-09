import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import db from './config/db';
import { socketService } from './services/socketService';
//1. Import All Routes Here
import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import driverRoutes from './routes/driverRoutes';
import timberStackRoutes from './routes/timberStackRoutes';
import dashboardRoute from './routes/dashboardRoute';
import userRoutes from './routes/userRoutes';
import rolePermissionRoutes from './routes/rolePermissionRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import unloadingSiteRoutes from './routes/unloadingSiteRoutes';
import waybillRoutes from './routes/waybillRoutes';
import puutavaraRoutes from './routes/puutavaraRoutes';
import locationRoutes from './routes/locationRoutes';
import otherMarkerRoutes from './routes/otherMarkerRoutes';
import puutavaralajiRoutes from './routes/timberLogRoutes';
import loadRoutes from './routes/loadRoutes';
import invoicingRoutes from './routes/invoicingRoutes';
import consignmentRoutes from './routes/consignmentRoutes';
import driverViewRoutes from './routes/driverViewRoutes';
import consignmentDriverRoutes from './routes/consignmentDriverRoutes';
import woodCategoryRoutes from './routes/woodCategoryRoutes';
import chipOrderRoutes from './routes/chipOrderRoutes';
import chipTitleRoutes from './routes/chipTitleRoutes';
import chipPlanningRoutes from './routes/chipPlanningRoutes';
import { globalErrorHandler } from './middlewares/errorHandler';
import chipInvoicingRoutes from './routes/chipInvoicingRoutes';

dotenv.config();

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '5000', 10);
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

const httpServer = http.createServer(app);

socketService.initialize(httpServer, frontendUrl);

const corsOptions = {
    origin: frontendUrl,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization"
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

//2. API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/timber-stacks', timberStackRoutes);
apiRouter.use('/dashboard', dashboardRoute);
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
apiRouter.use('/invoicing', invoicingRoutes);
apiRouter.use('/consignments', consignmentRoutes);
apiRouter.use('/driver', driverViewRoutes);
apiRouter.use('/driver/consignments', consignmentDriverRoutes);
apiRouter.use('/chip-orders', chipOrderRoutes);
apiRouter.use('/chip-titles', chipTitleRoutes);
apiRouter.use('/chip-planning', chipPlanningRoutes);
apiRouter.use('/chip-invoicing', chipInvoicingRoutes);

app.use('/api', apiRouter);

app.get('/', (req: Request, res: Response) => {
    res.send('WoodMaster LogiApp Backend is running!');
});

app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({ message: `Resource not found at ${req.originalUrl}` });
});

app.use(globalErrorHandler);

const startServer = async () => {
    try {
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