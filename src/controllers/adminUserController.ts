// backend/src/controllers/adminUserController.ts

import { Request, Response, NextFunction } from 'express';
import * as adminUserService from '../services/adminUserService';
import { CreateUserDto, AdminUpdateUserDto } from '../dto/user.dto';

/**
 * Handler to get all users.
 */
export const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await adminUserService.adminGetAllUsers(); // Correctly calls adminGetAllUsers
        res.status(200).json(users);
    } catch (error) {
        next(error);
    }
};

/**
 * Handler to get a single user by username (tunnus).
 */
export const getUserByTunnusHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        const user = await adminUserService.adminGetUserByTunnus(username);

        //console.log('[GET /admin/users/:tunnus] user =', JSON.stringify(user, null, 2));

        if (!user) { // This check is now valid because the service returns a user or null.
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};


/**
 * Handler to create a new user.
 */
export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, fullName, password, roleIds, isActive } = req.body as CreateUserDto;

        if (!username || !fullName || !password || !Array.isArray(roleIds)) {
            return res.status(400).json({ message: 'Invalid data provided' });
        }

        const newUser = await adminUserService.adminCreateNewUser(req.body as CreateUserDto);
        res.status(201).json(newUser);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ message: error.message });
        }
        if (error.message.includes('Invalid data provided')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * Handler to update a user by an admin.
 */
export const updateUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;
        const updateData = req.body as Partial<AdminUpdateUserDto> | undefined;

        if (!username) {
            return res.status(400).json({ message: 'User identifier (username) is required.' });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }

        const updatedUser = await adminUserService.adminUpdateUser(username, updateData);
        if (!updatedUser) { // This check is now valid.
            return res.status(404).json({ message: 'User not found for update.' });
        }

        res.status(200).json(updatedUser);

    } catch (error: any) {
        if (typeof error?.message === 'string') {
            if (error.message.includes('not found')) {
                return res.status(404).json({ message: error.message });
            }
            if (error.message.includes('Invalid data')) {
                return res.status(400).json({ message: error.message });
            }
        }
        return next(error);
    }

};

/**
 * Handler to delete a user.
 */
export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ message: 'User identifier (username) is required.' });
        }

        const result = await adminUserService.adminDeleteUser(username);
        return res.status(200).json(result);
    } catch (error: any) {
        const msg = typeof error?.message === 'string' ? error.message : '';
        if (msg.includes('not found')) {
            return res.status(404).json({ message: msg });
        }
        return next(error);
    }
};