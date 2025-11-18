// backend/src/routes/dashboardRoute.ts

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// --- Define permissions required for each route ---
const canViewAdminDashboard = 'dashboard_admin_view';
const canViewDispatchDashboard = 'dashboard_dispatch_view';
const canViewDriverDashboard = 'dashboard_driver_view';

// --- STATS CARDS ROUTES ---
router.get(
    '/admin',
    protect,
    authorize([canViewAdminDashboard]),
    dashboardController.getAdminDashboardHandler
);

router.get(
    '/dispatch',
    protect,
    authorize([canViewDispatchDashboard]),
    dashboardController.getDispatchDashboardHandler
);

router.get(
    '/driver',
    protect,
    authorize([canViewDriverDashboard]),
    dashboardController.getDriverDashboardHandler
);

// --- WIDGET ROUTES ---

// Volume chart data (accessible by users who can view EITHER Admin OR Dispatch dashboard)
router.get(
    '/volume-by-day',
    protect,
    authorize([canViewAdminDashboard, canViewDispatchDashboard]), // Allow if user has ANY of these permissions
    dashboardController.getVolumeByDayHandler
);

// Active trips list data (accessible ONLY by users who can view Dispatch dashboard)
router.get(
    '/active-trips',
    protect,
    authorize([canViewDispatchDashboard]),
    dashboardController.getActiveTripsListHandler
);

export default router;