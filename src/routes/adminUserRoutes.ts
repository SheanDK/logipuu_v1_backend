// backend/src/routes/adminUserRoutes.ts
import { Router } from 'express';
import * as adminUserController from '../controllers/adminUserController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateUserDto, AdminUpdateUserDto } from '../dto/user.dto';

const router = Router();

// 1. Define admin roles
const adminRoles = ['Superuser', 'Admin', 'Office'];

// 2. Define permission constants
const VIEW_USERS = ['users_view'];
const CREATE_USERS = ['users_create'];
const EDIT_USERS = ['users_edit'];
const DELETE_USERS = ['users_delete'];

// get all users
router.get('/', protect, authorize(adminRoles, VIEW_USERS), adminUserController.getAllUsersHandler);

// create new user
router.post('/', protect, authorize(adminRoles, CREATE_USERS), validateDto(CreateUserDto), adminUserController.createUserHandler);

// get details of a specific user by username
router.get('/:username', protect, authorize(adminRoles, VIEW_USERS), adminUserController.getUserByTunnusHandler);

// Update user
router.put('/:username', protect, authorize(adminRoles, EDIT_USERS), validateDto(AdminUpdateUserDto), adminUserController.updateUserHandler);

// Delete user
router.delete('/:username', protect, authorize(adminRoles, DELETE_USERS), adminUserController.deleteUserHandler);

export default router;