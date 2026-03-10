// backend/src/routes/locationRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { UpdateLocationDto } from '../dto/location.dto';

import {
    updateVehicleLocationHandler,
    createQuickPuulaaniHandler,
    createQuickPurkupaikkaHandler,
    searchAddressHandler
} from '../controllers/locationController';
// 1. Define Permissions
const router = Router();
const allowedRoles = ['Admin', 'Superuser'];

// 2. Define Roles
router.post('/update', protect, authorize(['Kuljettaja', 'Admin', 'Superuser']), validateDto(UpdateLocationDto), updateVehicleLocationHandler);
router.post('/quick-puulaani', protect, authorize(allowedRoles), createQuickPuulaaniHandler);
router.post('/quick-purkupaikka', protect, authorize(allowedRoles), createQuickPurkupaikkaHandler);
router.get('/search-address', protect, searchAddressHandler);



export default router;