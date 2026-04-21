// backend/src/routes/sessionRoutes.ts
import { Router } from 'express';
import * as sessionController from '../controllers/sessionController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// office users only (Admin/Dispatcher)
router.get('/active', protect, authorize(['dashboard_dispatch_view']), sessionController.getActiveSessions);
router.delete('/:id', protect, authorize(['load management_edit']), sessionController.forceReleaseSession);

export default router;