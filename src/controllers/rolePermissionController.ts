// backend/src/controllers/rolePermissionController.ts
import { Response, NextFunction } from 'express';
import * as service from '../services/rolePermissionService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

/**
 * Handler to get all roles WITH their assigned permissions.
 * Used for the main settings page.
 */
export const getRolesAndPermissionsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await service.getRolesAndPermissions(); // Use the correct service function name
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * Handler to get all available permissions in the system.
 */
export const getAllPermissionsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await service.getAllPermissions(); // Use the correct service function name
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * Handler to update the permissions for a specific role.
 */
export const updatePermissionsForRoleHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const roleId = parseInt(req.params.roleId as string, 10);

        // Backend DTO expects permissionIds (array of numbers)
        const { permissionIds } = req.body;

        if (isNaN(roleId) || !Array.isArray(permissionIds)) {
            return res.status(400).json({ message: 'Invalid role ID or permissions format (must be an array of numbers).' });
        }

        const result = await service.updatePermissionsForRole(roleId, permissionIds);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};


// <<<--- CORRECTION IS HERE ---<<<
// This is the correct implementation for the new handler.
/**
 * Handler to get a simple list of all roles (ID and Name).
 * Used for populating dropdowns in the UI.
 */
export const getAllRolesListHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        // This handler should call a specific service function for fetching just the role list.
        const roles = await service.fetchAllRolesList(); // We need to create this service function
        res.status(200).json(roles);
    } catch (error) {
        next(error);
    }
};