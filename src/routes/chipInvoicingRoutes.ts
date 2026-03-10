//backend/src/routes/chipInvoicingRoutes.ts

import { Router } from 'express';
import { searchChipInvoicing, markAsBilled } from '../controllers/chipInvoicingController';

const router = Router();

router.get('/search', searchChipInvoicing);
router.post('/invoice-selected', markAsBilled);

export default router;