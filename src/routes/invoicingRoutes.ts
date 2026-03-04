// src/routes/invoicingRoutes.ts
import { Router } from 'express';
import * as invoicingController from '../controllers/invoicingController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// 1. Healthcheck for connectivity/debugging
router.get('/__ping', (_req, res) => {
  console.log('[PING] /api/invoicing/__ping hit');
  res.json({ ok: true });
});

// 2. Permissions required to see invoicing data
const VIEW_INVOICING_PERMISSION = ['puulaani invoicing_view'];
const EDIT_INVOICING_PERMISSION = ['puulaani invoicing_edit'];

// 3. Protected search endpoint
router.get(
  '/search',
  protect,
  authorize(VIEW_INVOICING_PERMISSION),
  invoicingController.searchInvoicingHandler
);

// 4. update endpoint
router.patch(
  '/:id',
  protect,
  authorize(EDIT_INVOICING_PERMISSION),
  invoicingController.updateInvoicingHandler
);

// 5. Post change billing status
router.post(
  '/invoice',
  protect,
  authorize(EDIT_INVOICING_PERMISSION),
  invoicingController.invoiceManyHandler
);

export default router;
