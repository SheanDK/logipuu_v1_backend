// backend/src/middlewares/rbacMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

export const authorize = (requiredRoles: string[] = [], requiredPermissions: string[] = []) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'Authentication error: User not found in request.' });
        }
        
        // --- START OF DEBUGGING BLOCK ---
        //console.log(`--- RBAC Middleware Check for path: ${req.path} ---`);
        //console.log("Required Roles:", requiredRoles);
        //console.log("User's Roles found in Token:", user.roles);
        
        const hasRequiredRole = user.roles && user.roles.some((role: string) => {
            const roleExists = requiredRoles.includes(role);
            console.log(`Checking if user role "${role}" is in required list [${requiredRoles.join(', ')}]: ${roleExists}`);
            return roleExists;
        });
        
        //console.log("Final check result for 'hasRequiredRole':", hasRequiredRole);
        // --- END OF DEBUGGING BLOCK ---

        const hasRequiredPermission = user.permissions && user.permissions.some((permission: string) => requiredPermissions.includes(permission));

        if (requiredRoles.length > 0 && hasRequiredRole) {
            //console.log("--- RBAC PASSED: User has the required role. ---");
            return next();
        }

        if (requiredPermissions.length > 0 && hasRequiredPermission) {
            //console.log("--- RBAC PASSED: User has the required permission. ---");
            return next();
        }
        
        console.error("!!! RBAC FAILED: User does not have required role or permission. !!!");
        return res.status(403).json({ 
            message: 'Forbidden: You do not have the required permissions for this action.',
            required: { 
                roles: requiredRoles.length > 0 ? requiredRoles : 'None specified',
                permissions: requiredPermissions.length > 0 ? requiredPermissions : 'None specified'
            }
        });
    };
};