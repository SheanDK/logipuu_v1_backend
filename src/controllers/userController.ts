// backend/src/controllers/userController.ts
import { Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { UpdateUserProfileDto, ChangePasswordDto } from '../dto/user.dto';

export const getMyProfileHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tunnus = req.user?.userId;
        if (!tunnus) return res.status(401).json({ message: 'User not authenticated.' });
        
        const profile = await userService.getUserProfile(tunnus);
        res.status(200).json(profile);
    } catch (error) {
        next(error);
    }
};

// --- CORRECTED IMPLEMENTATION ---
export const updateMyProfileHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tunnus = req.user?.userId;
        const driverNumericId = req.user?.driverNumericId;

        if (!tunnus) return res.status(401).json({ message: 'User not authenticated.' });
        
        // Data is already validated by the validateDto middleware
        const profileDataToUpdate = req.body as UpdateUserProfileDto;

        const updatedProfile = await userService.updateUserProfile(
            tunnus,
            driverNumericId,
            profileDataToUpdate
        );
        res.status(200).json({
            message: 'Profile updated successfully.',
            profile: updatedProfile,
        });
    } catch (error: any) {
        // Handle specific errors from the service if necessary, otherwise pass to global handler
        next(error);
    }
};

// --- CORRECTED IMPLEMENTATION ---
export const changeMyPasswordHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const tunnus = req.user?.userId;
        if (!tunnus) return res.status(401).json({ message: 'User not authenticated.' });
        
        const passwordData = req.body as ChangePasswordDto;

        if (passwordData.newPassword.length < 8) {
             return res.status(400).json({ message: "New password must be at least 8 characters long." });
        }
        
        const result = await userService.changeUserPassword(tunnus, passwordData);
        res.status(200).json(result);
    } catch (error: any) {
        // Catch known errors from the service and send appropriate status codes
        if (error.message.includes('Incorrect current password') || error.message.includes('New password cannot be the same')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('User not found')) {
            return res.status(404).json({ message: error.message });
        }
        next(error);
    }
};