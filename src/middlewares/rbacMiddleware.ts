// backend/src/middlewares/rbacMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export const authorize = (requiredRoles: string[] = [], requiredPermissions: string[] = []) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication error: User not found in request.' });
        }
        
        if (user.roles && user.roles.includes('Superuser')) {
            return next();
        }
        
        const userRoles = user.roles || [];
        const userPermissions = user.permissions || [];

        const roleCheckRequired = requiredRoles.length > 0;
        const userHasRole = roleCheckRequired ? userRoles.some((role: string) => requiredRoles.includes(role)) : false;

        const permissionCheckRequired = requiredPermissions.length > 0;
        const userHasPermission = permissionCheckRequired ? requiredPermissions.every((permission: string) => userPermissions.includes(permission)) : false;

        if ( (roleCheckRequired && userHasRole) || (permissionCheckRequired && userHasPermission) ) {
            return next();
        }

        if (!roleCheckRequired && !permissionCheckRequired) {
            return next();
        }
        
        console.error(`!!! RBAC FAILED: User ${user.userId} (Roles: [${userRoles.join(', ')}]) blocked from ${req.method} ${req.path}`);
        return res.status(403).json({ 
            message: 'Forbidden: You do not have the required permissions for this action.',
            required: { 
                roles: requiredRoles.length > 0 ? requiredRoles : 'Not specified',
                permissions: requiredPermissions.length > 0 ? requiredPermissions : 'Not specified'
            }
        });
    };
};