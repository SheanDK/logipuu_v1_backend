//backend/src/routes/chipTransportRoutes.ts
import { Router } from 'express';
import { createChipOrder, deleteChipOrder, getActiveChipOrders, getWeeklyPlan, scheduleChipLoad, updateChipOrder } from '../controllers/chipOrderController';


const router = Router();

// 1. Office Side: Get Active Chip Orders
router.get('/active-orders', getActiveChipOrders);

// 2. Office Side: Create Chip Order
router.post('/orders', createChipOrder);

// 3. Office Side: Schedule a New Load
router.post('/schedule-load', scheduleChipLoad);

// 4. Office Side: Get Weekly Plan
router.get('/weekly-plan', getWeeklyPlan);

// 5. Office Side: Update Chip Order
router.put('/orders/:orderId', updateChipOrder);

// 6. Office Side: Delete Chip Order
router.delete('/orders/:orderId', deleteChipOrder);

export default router;