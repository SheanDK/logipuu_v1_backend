// backend/src/routes/vehicleRoutes.ts
import { Router } from 'express';
import * as vehicleController from '../controllers/vehicleController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

const router = Router();

const vehicleManagementRoles = ['Superuser', 'Admin', 'Toimisto'];
// GET all vehicles: Requires 'vehicle_view' permission
router.get(
    '/', 
    protect, 
    authorize(vehicleManagementRoles), 
    vehicleController.getAllVehiclesHandler);

// GET vehicle by ID: Requires 'vehicle_view' permission
router.get(
    '/:id', 
    protect, 
    authorize(vehicleManagementRoles), 
    vehicleController.getVehicleByIdHandler);

// POST a new vehicle: Requires 'vehicle_create' permission
router.post(
    '/', 
    protect, 
    authorize(vehicleManagementRoles), 
    validateDto(CreateVehicleDto), 
    vehicleController.createVehicleHandler);

// PUT to update a vehicle: Requires 'vehicle_edit' permission
router.put(
    '/:id', 
    protect, 
    authorize(vehicleManagementRoles), 
    validateDto(UpdateVehicleDto), 
    vehicleController.updateVehicleHandler);

// DELETE a vehicle: Requires 'vehicle_delete' permission
router.delete(
    '/:id', 
    protect, 
    authorize(vehicleManagementRoles), 
    vehicleController.deleteVehicleHandler);

    // This route must exist for the frontend validation to work.
router.get(
    '/check-reg-no', 
    protect, 
    authorize(vehicleManagementRoles), // Ensure only authorized users can use this endpoint
    vehicleController.checkRegistrationNoExistsHandler
);

export default router;