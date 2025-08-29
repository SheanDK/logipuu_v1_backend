// backend/src/routes/locationRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { UpdateLocationDto } from '../dto/location.dto';
import { updateVehicleLocationHandler } from '../controllers/locationController'; // Ensure this points to the updated controller

const router = Router();

// Define roles that are allowed to update vehicle locations
// Typically drivers, or a system service if updates are automated
const allowedUpdateRoles = ['Kuljettaja', 'Admin', 'Superuser']; // Adjust as per your application's roles

router.post(
    '/update',
    protect, // Ensures the user is authenticated
    authorize(allowedUpdateRoles), // Ensures the user has the required role
    validateDto(UpdateLocationDto), // Validates the request body against the DTO
    updateVehicleLocationHandler // The handler function in the controller
);

export default router;