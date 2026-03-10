// backend/src/controllers/rolePermissionController.ts
import { Response, NextFunction } from 'express';
import * as service from '../services/rolePermissionService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// 1. --- GET ALL ROLES WITH PERMISSIONS ---
export const getRolesAndPermissionsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await service.getRolesAndPermissions(); // Use the correct service function name
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// 2. --- GET ALL PERMISSIONS ---
export const getAllPermissionsHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const data = await service.getAllPermissions(); // Use the correct service function name
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
};

// 3. --- UPDATE PERMISSIONS FOR ROLE ---
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


// 4. --- GET ALL ROLES LIST ---
export const getAllRolesListHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const roles = await service.fetchAllRolesList();
        res.status(200).json(roles);
    } catch (error) {
        next(error);
    }
};