// backend/src/middlewares/rbacMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export const authorize = (roles: string[] = [], permissions: string[] = []) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication error: User not found.' });
        }
        
        if (user.roles && user.roles.includes('Superuser')) {
            return next();
        }
        
        const userRoles = user.roles || [];
        const userPermissions = user.permissions || [];

        const hasRole = roles.length > 0 && roles.some(r => userRoles.includes(r));

        const hasPermission = permissions.length > 0 && permissions.some(p => userPermissions.includes(p));

        if (roles.length === 0 && permissions.length === 0) {
            return next();
        }

        if (hasRole || hasPermission) {
            return next();
        }
        
        console.error(`!!! RBAC FAILED: User ${user.userId} (Roles: [${userRoles.join(', ')}]) blocked from ${req.method} ${req.path}`);
        
        return res.status(403).json({ 
            message: 'Forbidden: You do not have the required permissions for this action.',
            required: { roles, permissions }
        });
    };
};