// backend/src/middlewares/rbacMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

// The authorize function checks for EITHER a required role OR a required permission.
export const authorize = (requiredRoles: string[] = [], requiredPermissions: string[] = []) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication error: User not found in request.' });
        }

        // Check if user has at least one of the required roles
        const hasRequiredRole = user.roles && user.roles.some((role: string) => requiredRoles.includes(role));

        // CORRECTED: Explicitly type the 'permission' parameter as a string
        const hasRequiredPermission = user.permissions && user.permissions.some((permission: string) => requiredPermissions.includes(permission));

        // Allow access if user has a required role (for general access, e.g., viewing a page)
        if (requiredRoles.length > 0 && hasRequiredRole) {
            return next();
        }

        // Allow access if user has a required permission (for specific actions, e.g., deleting an item)
        if (requiredPermissions.length > 0 && hasRequiredPermission) {
            return next();
        }
        
        // If we reach here, user has neither the required roles nor permissions.
        return res.status(403).json({ 
            message: 'Forbidden: You do not have the required permissions for this action.',
            required: { 
                roles: requiredRoles.length > 0 ? requiredRoles : 'None specified',
                permissions: requiredPermissions.length > 0 ? requiredPermissions : 'None specified'
            }
        });
    };
};