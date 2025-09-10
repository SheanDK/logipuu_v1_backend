// backend/src/routes/timberStackRoutes.ts
import { Router } from 'express';
import * as timberStackController from '../controllers/timberStackController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateTimberStackDto, UpdateTimberStackLocationDto } from '../dto/timberStack.dto';

const router = Router();

// --- Define Roles ---
const officeRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles];

// --- Define Permissions ---
// These names must EXACTLY match the 'permission_name' in your 'permissions' table
const VIEW_TIMBER_STACKS_PERMISSION = ['timber map_view']; 
const CREATE_TIMBER_STACKS_PERMISSION = ['timber map_create'];
const EDIT_TIMBER_STACKS_PERMISSION = ['timber map_edit'];
const DELETE_TIMBER_STACKS_PERMISSION = ['timber map_delete'];

// Base routes for the collection
router.get('/', protect, authorize([], VIEW_TIMBER_STACKS_PERMISSION), timberStackController.getAllTimberStacksHandler);
router.post('/', protect, authorize([], CREATE_TIMBER_STACKS_PERMISSION), validateDto(CreateTimberStackDto), timberStackController.createTimberStackHandler);

// Custom specific route for the list view (used in Timber Management page)
router.get('/list', protect, authorize([], VIEW_TIMBER_STACKS_PERMISSION), timberStackController.getTimberStackListHandler);

// --- THIS IS THE FIX ---
// This route is used in the LoadFormModal by drivers and office staff.
// We will now check for the 'timber map_view' permission, which both roles have.
router.get(
    '/active/by-client/:clientId', 
    protect, 
    authorize([], VIEW_TIMBER_STACKS_PERMISSION), 
    timberStackController.getActiveTimberStacksByClientHandler
);

// Specific routes for a single resource that have extra path segments
router.get('/:id/full', protect, authorize([], VIEW_TIMBER_STACKS_PERMISSION), timberStackController.getTimberStackFullDetailsHandler);
router.put('/:id/full', protect, authorize([], EDIT_TIMBER_STACKS_PERMISSION), timberStackController.updateTimberStackFullHandler);
router.get('/:id/timber-types', protect, authorize([], VIEW_TIMBER_STACKS_PERMISSION), timberStackController.getTimberTypesForStackHandler);
router.get('/:id/wood-entries', protect, authorize(allStaffRoles), timberStackController.getWoodEntriesByPuulaaniIdHandler);

router.patch(
    '/:id/location', 
    protect, 
    authorize([], EDIT_TIMBER_STACKS_PERMISSION), 
    validateDto(UpdateTimberStackLocationDto), 
    timberStackController.updateTimberStackLocationHandler
);

// Generic routes for a single resource (these should come last)
router.get('/:id', protect, authorize([], VIEW_TIMBER_STACKS_PERMISSION), timberStackController.getTimberStackByIdHandler);
router.delete('/:id', protect, authorize([], DELETE_TIMBER_STACKS_PERMISSION), timberStackController.deleteTimberStackHandler);


export default router;