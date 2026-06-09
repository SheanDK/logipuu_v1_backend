// backend/src/controllers/authController.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as authService from '../services/authService';
import { UserLoginDTO } from '../dto/auth.dto';
import pool from '../config/db';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

// Login handler
export const loginUser: RequestHandler = async (req, res, next): Promise<void> => {
    try {
        const loginData: UserLoginDTO = req.body;

        if (!loginData.username || !loginData.password) {
            res.status(400).json({ message: 'Username and password are required' });
            return;
        }

        const result = await authService.loginUserService(loginData);
        res.status(200).json(result);
    } catch (error: any) {
        console.error(`Login attempt failed for user ${req.body?.username || 'unknown'}: ${error.message}`);
        if (error.message === 'Invalid username or password' || error.message === 'User account is inactive') {
            res.status(401).json({ message: error.message });
            return;
        }
        next(error);
    }
};

export const logoutHandler = async (req: AuthenticatedRequest, res: Response) => {
    const client = await pool.connect();
    try {
        const tokenIdentifier = req.headers.authorization;
        const userId = req.user?.driverNumericId;

        if (!tokenIdentifier || !userId) {
            return res.status(200).json({ success: true });
        }

        await client.query('BEGIN');

        await client.query(
            `DELETE FROM public.driver_active_sessions WHERE token_identifier = $1`,
            [tokenIdentifier]
        );

        const sessionCheck = await client.query(
            `SELECT count(*) FROM public.driver_active_sessions WHERE user_id = $1`,
            [userId]
        );

        const activeSessionCount = parseInt(sessionCheck.rows[0].count);
        if (activeSessionCount === 0) {
            await client.query(
                `UPDATE public.kayttajat SET current_vehicle_id = NULL WHERE kulj_id = $1`,
                [userId]
            );
            console.log(`✅ All sessions closed for Driver ${userId}. Vehicle is now free.`);

            const { socketService } = require('../services/socketService');
            socketService.emitToDispatchers('driverStatusChanged', {
                userId: Number(userId),
                status: 'offline'
            });
            socketService.emitToDispatchers('chipLoadUpdated', { action: 'SESSION_CLEANUP' });
        } else {
            console.log(`ℹ️ Driver ${userId} still has ${activeSessionCount} active sessions. Vehicle remains locked.`);
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Logout Error:", error);
        res.status(500).json({ error: 'Logout failed' });
    } finally {
        client.release();
    }
};