import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateDriverDto, UpdateDriverDto } from '../dto/driver.dto';

const router = Router();

const driverManagementRoles = ['Superuser', 'Admin', 'Toimisto'];

router.get(
    '/',
    protect,
    authorize(driverManagementRoles),
    driverController.getAllDriversHandler
);

router.get(
    '/:id',
    protect,
    authorize(driverManagementRoles),
    driverController.getDriverByIdHandler
);

router.post(
    '/',
    protect,
    authorize(driverManagementRoles),
    validateDto(CreateDriverDto),
    driverController.createDriverHandler
);

router.put(
    '/:id',
    protect,
    authorize(driverManagementRoles),
    validateDto(UpdateDriverDto),
    driverController.updateDriverHandler
);

router.delete(
    '/:id',
    protect,
    authorize(driverManagementRoles),
    driverController.deleteDriverHandler
);

export default router;