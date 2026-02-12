//backend/src/routes/chipTransportRoutes.ts
import { Router } from 'express';
import { createChipOrder, getActiveChipOrders, getWeeklyPlan, scheduleChipLoad } from '../controllers/chipOrderController';


const router = Router();

// Office Side: Get Active Chip Orders
router.get('/active-orders', getActiveChipOrders);

// Office Side: Create Chip Order
router.post('/orders', createChipOrder);

// Office Side: Schedule a New Load
router.post('/schedule-load', scheduleChipLoad);

// Office Side: Get Weekly Plan
router.get('/weekly-plan', getWeeklyPlan);

export default router;