// backend/src/routes/dashboardRoute.ts

import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// 1. Define permissions required for each route
const canViewAdminDashboard = 'dashboard_admin_view';
const canViewDispatchDashboard = 'dashboard_dispatch_view';
const canViewDriverDashboard = 'dashboard_driver_view';
const canViewOfficeDashboard = 'dashboard_office_view';

// 2. STATS CARDS ROUTES

// Admin dashboard stats
router.get(
    '/admin',
    protect,
    authorize([], [canViewAdminDashboard, canViewOfficeDashboard]),
    dashboardController.getAdminDashboardHandler
);

// Dispatch dashboard stats
router.get(
    '/dispatch',
    protect,
    authorize([], [canViewDispatchDashboard]),
    dashboardController.getDispatchDashboardHandler
);

// Driver dashboard stats
router.get(
    '/driver',
    protect,
    authorize([], [canViewDriverDashboard]),
    dashboardController.getDriverDashboardHandler
);

// Customer dashboard stats
router.get(
    '/customer-stats/:id',
    protect,
    authorize([], [canViewAdminDashboard, canViewOfficeDashboard]),
    dashboardController.getCustomerDashboardHandler);

// 3. WIDGET ROUTES

// Volume chart data
router.get(
    '/volume-by-day',
    protect,
    authorize([], [canViewAdminDashboard, canViewDispatchDashboard, canViewOfficeDashboard]),
    dashboardController.getVolumeByDayHandler
);

// Active trips list data
router.get(
    '/active-trips',
    protect,
    authorize([], [canViewDispatchDashboard, canViewAdminDashboard, canViewOfficeDashboard]),
    dashboardController.getActiveTripsListHandler
);

export default router;