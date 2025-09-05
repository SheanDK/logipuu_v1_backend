// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto } from '../dto/load.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();

// Define permissions for clarity
const VIEW_LOAD_PERMISSION = ['load_view'];
const CREATE_LOAD_PERMISSION = ['load_create']; // We can create this later if needed
const EDIT_LOAD_PERMISSION = ['load_edit'];     // We can create this later if needed
const DELETE_LOAD_PERMISSION = ['load_delete'];   // We can create this later if needed

// Define roles
const officeRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles];

// --- Driver Portal Routes ---
router.get('/my-loads', protect, authorize(driverRoles), loadController.getMyLoadsHandler);
router.patch('/:id/status', protect, authorize(driverRoles), validateDto(UpdateLoadStatusDto), loadController.updateLoadStatusHandler);

// --- General & Office Staff Routes ---
router.get('/', protect, authorize(officeRoles), loadController.getAllLoadsHandler);

// --- THIS IS THE FIX ---
// GET a single load by its ID. Now it checks for the 'load_view' permission.
// Both drivers and office staff will have this permission.
router.get('/:id', protect, authorize([], VIEW_LOAD_PERMISSION), loadController.getLoadByIdHandler);

// POST a new load (can be done by both office staff and drivers)
router.post('/', protect, authorize(allStaffRoles), validateDto(CreateLoadDto), loadController.createLoadHandler);

// PUT (update) an existing load (restricted to office staff)
router.put('/:id', protect,  authorize([], EDIT_LOAD_PERMISSION),  validateDto(UpdateLoadDto, { skipMissingProperties: true }), loadController.updateLoadHandler
);

// DELETE (soft delete) an existing load (restricted to office staff)
router.delete('/:id', protect, authorize(officeRoles), loadController.deleteLoadHandler);

export default router;