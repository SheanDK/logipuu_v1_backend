// backend/src/middlewares/rbacMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export const authorize = (requiredRoles: string[] = [], requiredPermissions: string[] = []) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication error: User not found in request.' });
        }
        
        // --- THIS IS THE FIX ---
        // If the user's roles array includes 'Superuser', they are automatically authorized.
        // This check happens before any other role or permission checks.
        if (user.roles && user.roles.includes('Superuser')) {
            console.log(`--- RBAC PASSED: Superuser '${user.userId}' granted access automatically. ---`);
            return next();
        }
        // --- END OF FIX ---
        
        const hasRequiredRole = user.roles && user.roles.some((role: string) => requiredRoles.includes(role));
        
        const hasRequiredPermission = user.permissions && requiredPermissions.every((permission: string) => user.permissions.includes(permission));

        // Note: The logic is now "OR". If you have the role OR the permission, you pass.
        if (hasRequiredRole || hasRequiredPermission) {
            return next();
        }
        
        console.error(`!!! RBAC FAILED: User ${user.userId} does not have required role or permission.`);
        return res.status(403).json({ 
            message: 'Forbidden: You do not have the required permissions for this action.',
            required: { 
                roles: requiredRoles.length > 0 ? requiredRoles : 'Not applicable',
                permissions: requiredPermissions.length > 0 ? requiredPermissions : 'Not applicable'
            },
            userHas: {
                roles: user.roles,
                permissions: user.permissions
            }
        });
    };
};