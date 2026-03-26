// backend/src/routes/userRoutes.ts
import { Router } from 'express';
import * as userController from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { ChangePasswordDto, UpdateUserProfileDto } from '../dto/user.dto';

const router = Router();

// 1. GET Routes
router.get(
    '/me/profile',
    protect,
    userController.getMyProfileHandler
);

// 2. PUT Routes
router.put(
    '/me/profile',
    protect,
    validateDto(UpdateUserProfileDto),
    userController.updateMyProfileHandler
);

router.put(
    '/me/current-vehicle',
    protect,
    userController.updateCurrentVehicleHandler
);

// 3. POST Routes
router.post(
    '/me/change-password',
    protect,
    validateDto(ChangePasswordDto),
    userController.changeMyPasswordHandler
);

export default router;