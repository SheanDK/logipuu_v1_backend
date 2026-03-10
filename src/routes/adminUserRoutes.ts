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

// 3. Get all users
router.get('/', protect, authorize(adminRoles, VIEW_USERS), adminUserController.getAllUsersHandler);

// 4. Create new user
router.post('/', protect, authorize(adminRoles, CREATE_USERS), validateDto(CreateUserDto), adminUserController.createUserHandler);

// 5. Get details of a specific user by username
router.get('/:username', protect, authorize(adminRoles, VIEW_USERS), adminUserController.getUserByTunnusHandler);

// 6. Update user
router.put('/:username', protect, authorize(adminRoles, EDIT_USERS), validateDto(AdminUpdateUserDto), adminUserController.updateUserHandler);

// 7. Delete user
router.delete('/:username', protect, authorize(adminRoles, DELETE_USERS), adminUserController.deleteUserHandler);

export default router;