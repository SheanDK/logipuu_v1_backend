// backend/src/routes/vehicleRoutes.ts
import { Router } from 'express';
import * as vehicleController from '../controllers/vehicleController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateVehicleDto, UpdateVehicleDto } from '../dto/vehicle.dto';

const router = Router();

// Define permissions required for each action
const VIEW_VEHICLE_PERMISSION = ['vehicle_view'];
const CREATE_VEHICLE_PERMISSION = ['vehicle_create'];
const EDIT_VEHICLE_PERMISSION = ['vehicle_edit'];
const DELETE_VEHICLE_PERMISSION = ['vehicle_delete'];
const officeRoles = ['Superuser', 'Admin', 'Toimisto']; // Roles that can use check-reg-no

// GET all vehicles: Requires 'vehicle_view' permission
router.get('/', protect, authorize([], VIEW_VEHICLE_PERMISSION), vehicleController.getAllVehiclesHandler);

// GET vehicle by ID: Requires 'vehicle_view' permission
router.get('/:id', protect, authorize([], VIEW_VEHICLE_PERMISSION), vehicleController.getVehicleByIdHandler);

// POST a new vehicle: Requires 'vehicle_create' permission
router.post('/', protect, authorize([], CREATE_VEHICLE_PERMISSION), validateDto(CreateVehicleDto), vehicleController.createVehicleHandler);

// PUT to update a vehicle: Requires 'vehicle_edit' permission
router.put('/:id', protect, authorize([], EDIT_VEHICLE_PERMISSION), validateDto(UpdateVehicleDto), vehicleController.updateVehicleHandler);

// DELETE a vehicle: Requires 'vehicle_delete' permission
router.delete('/:id', protect, authorize([], DELETE_VEHICLE_PERMISSION), vehicleController.deleteVehicleHandler);

// This route can be restricted to office staff roles or a specific permission
router.get('/check-reg-no', protect, authorize(officeRoles), vehicleController.checkRegistrationNoExistsHandler);

export default router;