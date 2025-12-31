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
const canViewOfficeDashboard = 'dashboard_office_view'; 

// --- STATS CARDS ROUTES ---

router.get(
    '/admin',
    protect,
    authorize([],[canViewAdminDashboard, canViewOfficeDashboard]), 
    dashboardController.getAdminDashboardHandler
);

router.get(
    '/dispatch',
    protect,
    authorize([],[canViewDispatchDashboard]),
    dashboardController.getDispatchDashboardHandler
);

router.get(
    '/driver',
    protect,
    authorize([],[canViewDriverDashboard]),
    dashboardController.getDriverDashboardHandler
);

// --- WIDGET ROUTES ---

// Volume chart data
router.get(
    '/volume-by-day',
    protect,
    authorize([],[canViewAdminDashboard, canViewDispatchDashboard, canViewOfficeDashboard]), 
    dashboardController.getVolumeByDayHandler
);

// Active trips list data
router.get(
    '/active-trips',
    protect,
    authorize([],[canViewDispatchDashboard, canViewAdminDashboard, canViewOfficeDashboard]), 
    dashboardController.getActiveTripsListHandler
);

export default router;