// backend/src/routes/rolePermissionRoutes.ts
import { Router } from 'express';
import * as controller from '../controllers/rolePermissionController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();

// 1. Define role groups for clarity and reuse
const settingsManagerRoles = ['Superuser', 'Admin'];
const superuserOnlyRole = ['Superuser'];

// 2. Fetches all roles WITH their assigned permissions (for the main settings page)
router.get(
    '/roles-with-permissions',
    [protect, authorize(settingsManagerRoles)],
    controller.getRolesAndPermissionsHandler
);

// 3. Fetches a simple list of all roles (for populating dropdowns)
router.get(
    '/roles',
    [protect, authorize(settingsManagerRoles)],
    controller.getAllRolesListHandler
);

// 4. Fetches all available permissions in the system
router.get(
    '/permissions',
    [protect, authorize(settingsManagerRoles)],
    controller.getAllPermissionsHandler
);

// 5. Updates permissions for a specific role
router.put(
    '/roles/:roleId/permissions',
    [protect, authorize(superuserOnlyRole)],
    controller.updatePermissionsForRoleHandler
);

export default router;