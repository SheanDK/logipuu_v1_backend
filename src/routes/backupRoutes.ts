// backend/src/routes/backupRoutes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/backupController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { verifyReAuth } from '../middlewares/reAuthMiddleware';

const router = Router();
const adminRoles = ['Superuser', 'Admin'];

// Secure endpoints with authorization and password re-authentication
router.get('/template/:module', protect, authorize(adminRoles), ctrl.downloadTemplateHandler);
router.post('/export', protect, authorize(adminRoles), verifyReAuth, ctrl.exportDataHandler);

router.post('/import/validate', protect, authorize(adminRoles), ctrl.validateImportHandler);
router.post('/import/execute', protect, authorize(adminRoles), ctrl.executeImportHandler);

export default router;