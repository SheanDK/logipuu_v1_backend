// backend/src/routes/chipInvoicingRoutes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/chipInvoicingController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
router.get('/search', protect, ctrl.searchInvoicing);
router.post('/confirm', protect, ctrl.confirmInvoicing);
router.patch('/load/:id', protect, ctrl.updateLoadHandler);

export default router;