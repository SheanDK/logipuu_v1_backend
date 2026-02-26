// backend/src/controllers/authController.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as authService from '../services/authService';
import { UserLoginDTO } from '../dto/auth.dto';

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