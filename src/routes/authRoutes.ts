import { Router } from 'express';
import * as authController from '../controllers/authController';
import { protect, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Response } from 'express'; // Import Response type

const router = Router();

router.post('/login', authController.loginUser);

router.get('/me', protect, (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
        res.status(200).json({
            message: 'You are authorized!',
            user: req.user,
        });
    } else {
        res.status(401).json({ message: 'User data not found after authentication.'});
    }
});

export default router;