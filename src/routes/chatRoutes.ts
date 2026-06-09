// backend/src/routes/chatRoutes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/chatController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();
router.get('/contacts', protect, ctrl.getActiveContacts);
router.get('/history/:partnerId', protect, ctrl.getChatHistory);
router.get('/broadcasts', protect, ctrl.getBroadcastHistory);
router.get('/driver-contacts', protect, ctrl.getDriverContacts);
router.post('/delete-messages', protect, ctrl.deleteMessages);

export default router;