// backend/src/middlewares/reAuthMiddleware.ts
import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { AuthenticatedRequest } from './authMiddleware';

export const verifyReAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Re-authentication password is required.' });
    }

    try {
        const username = req.user?.userId;
        const result = await pool.query('SELECT salasana FROM public.kayttajat WHERE tunnus = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(password, result.rows[0].salasana);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password. Access denied.' });
        }

        next();
    } catch (err: any) {
        next(err);
    }
};