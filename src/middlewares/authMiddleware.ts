// backend/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your_fallback_secret_for_dev';

// UserPayload interface now includes the 'permissions' property
export interface UserPayload extends JwtPayload {
    userId: string;
    fullName: string;
    roles: string[];
    permissions: string[];
    userLevel: number;
    driverNumericId?: number;
    // kalustoNro?: number;
}

// Keep AuthenticatedRequest for clarity, or switch to global type declaration
export interface AuthenticatedRequest extends Request {
    user?: UserPayload;
}

// Protect routes
export const protect = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
            req.user = decoded;

            next();
        } catch (error) {
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