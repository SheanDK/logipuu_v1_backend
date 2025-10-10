// backend/src/routes/consignmentDriverRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import * as controller from '../controllers/consignmentDriverController';

const router = Router();
const driverRoles = ['Kuljettaja'];

// All routes are protected and require the driver role
router.use(protect, authorize(driverRoles));

router.get('/', controller.getAllConsignmentsHandler);
router.post('/', controller.createConsignmentHandler);
router.get('/:id', controller.getConsignmentByIdHandler);
router.put('/:id', controller.updateConsignmentHandler);

export default router;