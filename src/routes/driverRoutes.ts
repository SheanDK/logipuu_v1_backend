// backend/src/routes/driverRoutes.ts
import { Router } from 'express';
import * as driverController from '../controllers/driverController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateDriverDto, UpdateDriverDto } from '../dto/driver.dto';

const router = Router();

// 1. Define permissions required for each action
const VIEW_DRIVER_PERMISSION = ['drivers_view'];
const CREATE_DRIVER_PERMISSION = ['drivers_create'];
const EDIT_DRIVER_PERMISSION = ['drivers_edit'];
const DELETE_DRIVER_PERMISSION = ['drivers_delete'];

// 2. Get drivers without account
router.get(
    '/no-account',
    protect,
    authorize(['Superuser', 'Admin', 'Office']),
    driverController.getDriversWithoutAccountHandler
);

// 3. Get all drivers
router.get('/', protect, authorize([], VIEW_DRIVER_PERMISSION), driverController.getAllDriversHandler);

// 4. Get driver by ID
router.get('/:id', protect, authorize([], VIEW_DRIVER_PERMISSION), driverController.getDriverByIdHandler);

// 5. Create driver
router.post('/', protect, authorize([], CREATE_DRIVER_PERMISSION), validateDto(CreateDriverDto), driverController.createDriverHandler);

// 6. Update driver
router.put('/:id', protect, authorize([], EDIT_DRIVER_PERMISSION), validateDto(UpdateDriverDto), driverController.updateDriverHandler);

// 7. Delete driver
router.delete('/:id', protect, authorize([], DELETE_DRIVER_PERMISSION), driverController.deleteDriverHandler);

export default router;