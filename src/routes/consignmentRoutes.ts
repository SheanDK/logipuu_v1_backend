// backend/src/routes/consignmentRoutes.ts
import { Router } from 'express';
// Controller එක හරියටම import කරගන්න. (Path එක ගැන සැලකිලිමත් වන්න)
import * as consignmentController from '../controllers/consignmentController'; 
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// PERMISSIONS
const VIEW_PERMISSION = ['consignment invoicing_view'];
const CREATE_PERMISSION = ['consignment invoice_create'];
const EDIT_PERMISSION = ['consignment invoicing_edit'];
const DELETE_PERMISSION = ['consignment invoicing_delete'];

// 1. SEARCH route එක (/:id ට කලින් තිබිය යුතුමයි)
router.get(
  '/search',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.searchConsignmentsHandler
);

// 2. INVOICE route එක (Specific route)
router.post(
  '/invoice',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.invoiceManyHandler
);

// 3. ID based routes (මේවා යටින් තිබිය යුතුයි)
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

// 4. Root POST
router.post(
  '/',
  protect,
  authorize(CREATE_PERMISSION),
  consignmentController.createConsignmentHandler
);

export default router;