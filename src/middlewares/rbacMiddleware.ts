// backend/src/middlewares/rbacMiddleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';


export const authorize = (arg1: string[] = [], arg2: string[] = []) => {
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

        
        const userAccessPool = [...userRoles, ...userPermissions];

        
        const requiredPool = [...arg1, ...arg2];

        
        if (requiredPool.length === 0) {
            return next();
        }

    
        const hasAccess = requiredPool.some(item => userAccessPool.includes(item));

        if (hasAccess) {
            return next();
        }
        
        console.error(`!!! RBAC FAILED: User ${user.userId} (Roles: [${userRoles.join(', ')}]) blocked from ${req.method} ${req.path}`);
        console.log(`Required: ${requiredPool.join(' OR ')}`);

        return res.status(403).json({ 
            message: 'Forbidden: You do not have the required permissions for this action.',
            userRoles,
            requiredItems: requiredPool
        });
    };
};