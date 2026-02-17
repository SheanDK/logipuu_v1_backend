// backend/src/routes/locationRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { UpdateLocationDto } from '../dto/location.dto';
import {
    updateVehicleLocationHandler,
    createQuickPuulaaniHandler,
    createQuickPurkupaikkaHandler
} from '../controllers/locationController';

const router = Router();
const allowedRoles = ['Admin', 'Superuser'];

router.post('/update', protect, authorize(['Kuljettaja', 'Admin', 'Superuser']), validateDto(UpdateLocationDto), updateVehicleLocationHandler);
router.post('/quick-puulaani', protect, authorize(allowedRoles), createQuickPuulaaniHandler);
router.post('/quick-purkupaikka', protect, authorize(allowedRoles), createQuickPurkupaikkaHandler);

export default router;