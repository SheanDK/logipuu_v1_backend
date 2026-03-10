// backend/src/routes/consignmentDriverRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import * as controller from '../controllers/consignmentDriverController';

const router = Router();
const driverRoles = ['Kuljettaja'];

// 1. All routes are protected and require the driver role
router.use(protect, authorize(driverRoles));

// 2. Get all consignments
router.get('/', controller.getAllConsignmentsHandler);

// 3. Create consignment
router.post('/', controller.createConsignmentHandler);

// 4. Get consignment by ID
router.get('/:id', controller.getConsignmentByIdHandler);

// 5. Update consignment
router.put('/:id', controller.updateConsignmentHandler);

export default router;