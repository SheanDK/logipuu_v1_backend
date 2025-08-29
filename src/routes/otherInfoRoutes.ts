// backend/src/routes/otherInfoRoutes.ts
import { Router } from 'express';
import * as otherInfoController from '../controllers/otherInfoController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateOtherInfoDto, UpdateOtherInfoDto } from '../dto/otherInfo.dto';

const router = Router();

const allowedRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä']; // Adjust roles as needed

router.get('/', protect, authorize(allowedRoles), otherInfoController.getAllOtherInfosHandler);
router.get('/:id', protect, authorize(allowedRoles), otherInfoController.getOtherInfoByIdHandler);
router.post('/', protect, authorize(allowedRoles), validateDto(CreateOtherInfoDto), otherInfoController.createOtherInfoHandler);
router.put('/:id', protect, authorize(allowedRoles), validateDto(UpdateOtherInfoDto), otherInfoController.updateOtherInfoHandler);
router.delete('/:id', protect, authorize(allowedRoles), otherInfoController.deleteOtherInfoHandler);

export default router;