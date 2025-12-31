// backend/src/routes/timberLogRoutes.ts
import { Router } from 'express';
import * as puutavaralajiController from '../controllers/timberLogController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();
const allowedRoles = ['Superuser', 'Admin', 'Office', 'Ajojärjestelijä']; // Adjust as needed

router.get(
    '/for-stack/:puulaaniId', 
    protect, 
    authorize(allowedRoles), 
    puutavaralajiController.getTimberLogsForStackHandler
);

export default router;