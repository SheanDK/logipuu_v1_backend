// backend/src/routes/userRoutes.ts
import { Router } from 'express';
import * as userController from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import {ChangePasswordDto, UpdateUserProfileDto } from '../dto/user.dto';
//import { ChangePasswordDto } from '../dto/auth.dto';

const router = Router();

// Routes for the authenticated user to manage their own profile
router.get(
    '/me/profile', // Get current user's profile
    protect,
    userController.getMyProfileHandler
);

router.put(
    '/me/profile', // Update current user's profile
    protect,
    validateDto(UpdateUserProfileDto),
    userController.updateMyProfileHandler
);

router.post(
    '/me/change-password', // Change current user's password
    protect,
    validateDto(ChangePasswordDto),
    userController.changeMyPasswordHandler
);

// Admin routes for managing all users can also be added here, with appropriate RBAC
// router.get('/', protect, authorize(['Admin', 'Superuser']), userController.getAllUsersHandler);
// router.get('/:userId', protect, authorize(['Admin', 'Superuser']), userController.getUserByIdHandler);
// ... etc.

export default router;