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
        const { tunnus } = req.params;
        const user = await adminUserService.adminGetUserByTunnus(tunnus);
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
 * <<<--- CORRECTION IS HERE: Renamed function to match the route ---<<<
 */
export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userData = res.locals.validatedDto; // This is now a fully typed and validated CreateUserDto instance
        const newUser = await adminUserService.adminCreateNewUser(userData); // Correctly calls adminCreateNewUser
        res.status(201).json(newUser);
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ message: error.message }); // 409 Conflict is more appropriate
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
        const { tunnus } = req.params;
        const updateData = res.locals.validatedDto;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No update data provided.' });
        }
        
        const updatedUser = await adminUserService.adminUpdateUser(tunnus, updateData);
        if (!updatedUser) { // This check is now valid.
            return res.status(404).json({ message: 'User not found for update.' });
        }
        res.status(200).json(updatedUser);
    } catch (error: any) {
        if (error.message.includes('not found') || error.message.includes('Invalid data')) {
            return res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * Handler to delete a user.
 */
export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tunnus } = req.params;
        const result = await adminUserService.adminDeleteUser(tunnus); // Correctly calls adminDeleteUser
        res.status(200).json(result);
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};