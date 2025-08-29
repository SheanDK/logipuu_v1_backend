import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

const adminToimistoRoles = ['Superuser', 'Admin', 'Toimisto'];
const dispatchRoles = ['Superuser', 'Admin', 'Ajojärjestelijä'];
const driverRole = ['Kuljettaja'];

router.get(
    '/admin',
    protect,
    authorize(adminToimistoRoles),
    dashboardController.getAdminDashboardHandler
);

router.get(
    '/dispatch',
    protect,
    authorize(dispatchRoles),
    dashboardController.getDispatchDashboardHandler
);

router.get(
    '/driver',
    protect,
    authorize(driverRole),
    dashboardController.getDriverDashboardHandler
);

export default router;