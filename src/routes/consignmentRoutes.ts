// backend/src/routes/consignmentRoutes.ts
import { Router } from 'express';
import * as consignmentController from '../controllers/consignmentController'; 
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// PERMISSIONS
const VIEW_PERMISSION = ['consignment invoicing_view'];
const CREATE_PERMISSION = ['consignment invoice_create'];
const EDIT_PERMISSION = ['consignment invoicing_edit'];
const DELETE_PERMISSION = ['consignment invoicing_delete'];

router.get(
  '/search',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.searchConsignmentsHandler
);


router.post(
  '/invoice',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.invoiceManyHandler
);


router.get(
  '/:id',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.getConsignmentByIdHandler
);

router.patch(
  '/:id',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.updateConsignmentHandler
);

router.delete(
  '/:id',
  protect,
  authorize(DELETE_PERMISSION),
  consignmentController.deleteConsignmentHandler
);


router.post(
  '/',
  protect,
  authorize(CREATE_PERMISSION),
  consignmentController.createConsignmentHandler
);

export default router;