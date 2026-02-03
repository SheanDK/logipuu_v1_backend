// backend/src/routes/driverRoutes.ts
import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateDriverDto, UpdateDriverDto } from '../dto/driver.dto';

const router = Router();

// Define permissions required for each action
const VIEW_DRIVER_PERMISSION = ['drivers_view'];
const CREATE_DRIVER_PERMISSION = ['drivers_create'];
const EDIT_DRIVER_PERMISSION = ['drivers_edit'];
const DELETE_DRIVER_PERMISSION = ['drivers_delete'];

router.get(
    '/no-account',
    protect,
    authorize(['Superuser', 'Admin', 'Office']),
    driverController.getDriversWithoutAccountHandler
);

router.get('/', protect, authorize([], VIEW_DRIVER_PERMISSION), driverController.getAllDriversHandler);

router.get('/:id', protect, authorize([], VIEW_DRIVER_PERMISSION), driverController.getDriverByIdHandler);

router.post('/', protect, authorize([], CREATE_DRIVER_PERMISSION), validateDto(CreateDriverDto), driverController.createDriverHandler);

router.put('/:id', protect, authorize([], EDIT_DRIVER_PERMISSION), validateDto(UpdateDriverDto), driverController.updateDriverHandler);

router.delete('/:id', protect, authorize([], DELETE_DRIVER_PERMISSION), driverController.deleteDriverHandler);

export default router;