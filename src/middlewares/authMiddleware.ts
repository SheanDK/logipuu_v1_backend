// backend/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your_fallback_secret_for_dev';

// CORRECTED: UserPayload interface now includes the 'permissions' property
export interface UserPayload extends JwtPayload {
    userId: string;
    fullName: string;
    roles: string[];
    permissions: string[]; // <-- THIS IS THE CRITICAL FIX
    userLevel: number;
    driverNumericId?: number;
}

// Keep AuthenticatedRequest for clarity, or switch to global type declaration
export interface AuthenticatedRequest extends Request {
    user?: UserPayload;
}

export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // Verify the token and cast the entire decoded payload to UserPayload
            const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;

            // --- FOR DEBUGGING: Log what is decoded from the token ---
            console.log('--- Decoded Payload from Token in "protect" middleware ---');
            console.log(decoded);
            // --- END DEBUGGING ---

            // CORRECTED: Assign the whole decoded object directly to req.user
            // This ensures that `permissions` and all other properties are passed on.
            req.user = decoded;
            
            next();
        } catch (error) {
            console.error('Token verification failed:', error);
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            }
            return res.status(401).json({ message: 'Not authorized, generic token error' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};