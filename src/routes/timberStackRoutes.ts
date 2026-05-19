// backend/src/routes/timberStackRoutes.ts
import { Router } from 'express';
import * as timberStackController from '../controllers/timberStackController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateTimberStackDto } from '../dto/timberStack.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();

// 1. Define Roles and Permissions
const officeRoles = ['Superuser', 'Admin', 'Office', 'Ajärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles];
const TIMBER_MAP_VIEW = ['timber map_view'];
const TIMBER_MAP_CREATE = ['timber map_create'];
const TIMBER_MAP_EDIT = ['timber map_edit'];
const TIMBER_MAP_DELETE = ['timber map_delete'];

// 2. ROUTES

// Main list for map view 
router.get('/',
    protect,
    authorize(allStaffRoles, TIMBER_MAP_VIEW),
    timberStackController.getAllTimberStacksHandler
);

// The route for getting active stacks for a specific client.
router.get('/active/by-client/:clientId',
    protect,
    authorize(driverRoles),
    timberStackController.getActiveTimberStacksByClientHandler
);

// Get the list of wood entries/tasks for a specific Puulaani
router.get('/:id/wood-entries',
    protect,
    authorize(allStaffRoles, TIMBER_MAP_VIEW),
    timberStackController.getWoodEntriesByPuulaaniIdHandler
);

// Get full details for the edit modal in the office
router.get('/:id/full',
    protect,
    authorize(allStaffRoles, TIMBER_MAP_VIEW),
    timberStackController.getTimberStackFullDetailsHandler
);

// Update full details from the office edit modal
router.put('/:id/full',
    protect,
    authorize(officeRoles, TIMBER_MAP_EDIT),
    timberStackController.updateTimberStackFullHandler
);

// Update location from map drag-and-drop
router.patch('/:id/location',
    protect,
    authorize(officeRoles, TIMBER_MAP_EDIT),
    timberStackController.updateLocationHandler
);

// Get a single stack by its ID
router.get('/:id',
    protect,
    authorize(allStaffRoles, TIMBER_MAP_VIEW),
    timberStackController.getTimberStackByIdHandler
);

// Create a new timber stack
router.post('/',
    protect,
    authorize(officeRoles, TIMBER_MAP_CREATE),
    validateDto(CreateTimberStackDto),
    timberStackController.createTimberStackHandler
);

// Delete a timber stack
router.delete('/:id',
    protect,
    authorize(officeRoles, TIMBER_MAP_DELETE),
    timberStackController.deleteTimberStackHandler
);


export default router;