// backend/src/routes/waybillRoutes.ts
import { Router } from 'express';
import * as waybillController from '../controllers/waybillController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateWaybillDto, UpdateWaybillDto } from '../dto/waybill.dto';

const router = Router();

const allowedRoles = ['Superuser', 'Admin', 'Office', 'Ajojärjestelijä'];

// 1. GET Routes
router.get('/', protect, authorize(allowedRoles), waybillController.getAllWaybillsHandler);
router.get('/:id', protect, authorize(allowedRoles), waybillController.getWaybillByIdHandler);

// 2. POST Routes
router.post('/', protect, authorize(allowedRoles), validateDto(CreateWaybillDto), waybillController.createWaybillHandler);

// 3. PUT Routes
router.put('/:id', protect, authorize(allowedRoles), validateDto(UpdateWaybillDto), waybillController.updateWaybillHandler);

// 4. DELETE Routes
router.delete('/:id', protect, authorize(allowedRoles), waybillController.deleteWaybillHandler);

export default router;