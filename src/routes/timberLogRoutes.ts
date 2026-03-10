// backend/src/routes/timberLogRoutes.ts
import { Router } from 'express';
import * as puutavaralajiController from '../controllers/timberLogController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();
const allowedRoles = ['Superuser', 'Admin', 'Office', 'Ajojärjestelijä'];
// 1. Get timber logs for stack
router.get(
    '/for-stack/:puulaaniId',
    protect,
    authorize(allowedRoles),
    puutavaralajiController.getTimberLogsForStackHandler
);

export default router;