// backend/src/routes/puutavaraRoutes.ts
import { Router } from 'express';
import * as controller from '../controllers/puutavaraController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();
const viewPermission = ['timber management_view'];

router.get('/', protect, authorize([], viewPermission), controller.getAllHandler);

export default router;