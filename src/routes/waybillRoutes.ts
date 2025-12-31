// backend/src/routes/waybillRoutes.ts
import { Router } from 'express';
import * as waybillController from '../controllers/waybillController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateWaybillDto, UpdateWaybillDto } from '../dto/waybill.dto';

const router = Router();

const allowedRoles = ['Superuser', 'Admin', 'Office', 'Ajojärjestelijä']; // Adjust roles as needed

router.get('/', protect, authorize(allowedRoles), waybillController.getAllWaybillsHandler);
router.get('/:id', protect, authorize(allowedRoles), waybillController.getWaybillByIdHandler);
router.post('/', protect, authorize(allowedRoles), validateDto(CreateWaybillDto), waybillController.createWaybillHandler);
router.put('/:id', protect, authorize(allowedRoles), validateDto(UpdateWaybillDto), waybillController.updateWaybillHandler);
router.delete('/:id', protect, authorize(allowedRoles), waybillController.deleteWaybillHandler);

export default router;