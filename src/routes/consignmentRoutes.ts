import { Router } from 'express';
import * as consignmentController from '../controllers/consignmentController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

/* -----------------------------------------------------------------------------
 * RBAC permissions 
 * ---------------------------------------------------------------------------*/
const VIEW_PERMISSION = ['consignment invoicing_view'];
const CREATE_PERMISSION = ['consignment invoice_create'];
const EDIT_PERMISSION = ['consignment invoicing_edit'];
const DELETE_PERMISSION = ['consignment invoicing_delete'];

/* -----------------------------------------------------------------------------
 * Routes
 * All routes are protected; RBAC is enforced per action via `authorize`.
 * The order of middlewares is: protect -> authorize -> controller handler.
 * ---------------------------------------------------------------------------*/

/**
 * GET /search
 * Search consignments with query parameters (date range, customer, vehicle, status).
 */
router.get(
  '/search',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.searchConsignmentsHandler
);

/**
 * GET /:id
 * Fetch a single consignment by its id.
 */
router.get(
  '/:id',
  protect,
  authorize(VIEW_PERMISSION),
  consignmentController.getConsignmentByIdHandler
);

/**
 * POST /
 * Create a new consignment row.
 */
router.post(
  '/',
  protect,
  authorize(CREATE_PERMISSION),
  consignmentController.createConsignmentHandler
);

/**
 * PATCH /:id
 * Partially update a consignment row.
 */
router.patch(
  '/:id',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.updateConsignmentHandler
);

/**
 * DELETE /:id
 * Delete a single consignment row.
 */
router.delete(
  '/:id',
  protect,
  authorize(DELETE_PERMISSION),
  consignmentController.deleteConsignmentHandler
);

/**
 * POST /invoice
 * Trigger invoicing for multiple consignments (expects body with identifiers).
 */
router.post(
  '/invoice',
  protect,
  authorize(EDIT_PERMISSION),
  consignmentController.invoiceManyHandler
);

export default router;
