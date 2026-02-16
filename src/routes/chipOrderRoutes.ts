//backend/src/routes/chipTransportRoutes.ts
import { Router } from 'express';
import { createChipOrder, deleteChipOrder, getActiveChipOrders, getWeeklyPlan, scheduleChipLoad, updateChipOrder } from '../controllers/chipOrderController';


const router = Router();

// Office Side: Get Active Chip Orders
router.get('/active-orders', getActiveChipOrders);

// Office Side: Create Chip Order
router.post('/orders', createChipOrder);

// Office Side: Schedule a New Load
router.post('/schedule-load', scheduleChipLoad);

// Office Side: Get Weekly Plan
router.get('/weekly-plan', getWeeklyPlan);

// Office Side: Update Chip Order
router.put('/orders/:orderId', updateChipOrder);

// Office Side: Delete Chip Order
router.delete('/orders/:orderId', deleteChipOrder);

export default router;