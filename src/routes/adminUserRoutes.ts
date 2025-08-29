// backend/src/routes/adminUserRoutes.ts
import { Router } from 'express';
import * as adminUserController from '../controllers/adminUserController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateUserDto, AdminUpdateUserDto } from '../dto/user.dto';

const router = Router();
const adminRoles = ['Superuser', 'Admin'];

router.get('/', protect, authorize(adminRoles), adminUserController.getAllUsersHandler);
router.post('/', protect, authorize(adminRoles), validateDto(CreateUserDto), adminUserController.createUserHandler);

router.get('/:tunnus', protect, authorize(adminRoles), adminUserController.getUserByTunnusHandler);
router.put('/:tunnus', protect, authorize(adminRoles), validateDto(AdminUpdateUserDto), adminUserController.updateUserHandler);
router.delete('/:tunnus', protect, authorize(adminRoles), adminUserController.deleteUserHandler);

export default router;