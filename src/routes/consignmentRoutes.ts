// backend/src/routes/consignmentRoutes.ts
import { Router } from 'express';
import * as consignmentController from '../controllers/consignmentController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// 1. Define Permissions
const VIEW_PERMISSION = ['consignment invoicing_view'];
const CREATE_PERMISSION = ['consignment invoice_create'];
const EDIT_PERMISSION = ['consignment invoicing_edit'];
const DELETE_PERMISSION = ['consignment invoicing_delete'];

// 2. Search consignments
router.get(
  '/search',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.searchConsignmentsHandler
);

// 3. Invoice consignments
router.post(
  '/invoice',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.invoiceManyHandler
);

// 4. Get consignment by ID
router.get(
  '/:id',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.getConsignmentByIdHandler
);

// 5. Update consignment
router.patch(
  '/:id',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.updateConsignmentHandler
);

// 6. Delete consignment
router.delete(
  '/:id',
  protect,
  authorize(DELETE_PERMISSION),
  consignmentController.deleteConsignmentHandler
);

// 7. Create consignment
router.post(
  '/',
  protect,
  authorize(CREATE_PERMISSION),
  consignmentController.createConsignmentHandler
);

export default router;