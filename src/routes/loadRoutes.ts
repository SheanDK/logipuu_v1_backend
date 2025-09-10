// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto, CompleteLoadDto, AcceptLoadsDto } from '../dto/load.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();

// Define permissions for clarity
const VIEW_LOAD_PERMISSION = ['load management_view'];
const CREATE_LOAD_PERMISSION = ['load management_create']; // We can create this later if needed
const EDIT_LOAD_PERMISSION = ['load management_edit'];     // We can create this later if needed
const DELETE_LOAD_PERMISSION = ['load management_delete'];   // We can create this later if needed

// // Define permissions for clarity
// const VIEW_LOAD_PERMISSION = ['load_view'];
// const CREATE_LOAD_PERMISSION = ['load_create']; // We can create this later if needed
// const EDIT_LOAD_PERMISSION = ['load_edit'];     // We can create this later if needed
// const DELETE_LOAD_PERMISSION = ['load_delete'];   // We can create this later if needed

// --- Define Roles ---
const officeRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles]; // For actions both can perform



// === DRIVER PORTAL ROUTES ===

// Get all loads assigned to the currently logged-in driver
router.get('/my-loads', 
    protect, 
    authorize(driverRoles), 
    loadController.getMyLoadsHandler
);

// Update the status of a load (e.g., 'In Progress', 'At Origin')
router.patch('/:id/status', 
    protect, 
    authorize(driverRoles), 
    validateDto(UpdateLoadStatusDto), 
    loadController.updateLoadStatusHandler
);

// --- THIS IS THE NEW ROUTE for COMPLETING a trip ---
// Mark a trip as complete and submit final data (actual_m3, actual_km)
router.patch('/:id/complete',
    protect,
    authorize(driverRoles),
    validateDto(CompleteLoadDto),
    loadController.completeLoadHandler
);


// === OFFICE / GENERAL ROUTES ===

router.get('/for-inspection',
    protect,
    authorize(officeRoles), // Or a specific permission like 'driven_inspection_view'
    loadController.getLoadsForInspectionHandler
);

// Get a list of all loads, with optional filters (for office staff)
router.get('/', 
    protect, 
    authorize(officeRoles), 
    loadController.getAllLoadsHandler
);

// Get the full details of a single load by its ID
// Accessible by both drivers (for their own loads) and office staff
router.get('/:id', 
    protect, 
    authorize([], VIEW_LOAD_PERMISSION), 
    loadController.getLoadByIdHandler
);

// Create a new load (can be done by both roles)
router.post('/', 
    protect, 
    authorize(allStaffRoles, CREATE_LOAD_PERMISSION), // Added permission check for consistency
    validateDto(CreateLoadDto), 
    loadController.createLoadHandler
);

// Update an existing load's details
// Now checks for a specific permission, which both roles can have (but service layer restricts fields for drivers)
router.put('/:id', 
    protect, 
    authorize([], EDIT_LOAD_PERMISSION), 
    validateDto(UpdateLoadDto, { skipMissingProperties: true }), 
    loadController.updateLoadHandler
);

// --- THIS IS THE NEW ROUTE FOR ACCEPTING TRIPS ---
router.post('/accept-for-invoicing', 
    protect, 
    authorize(officeRoles), // Or a specific permission like 'driven_inspection_accept'
    validateDto(AcceptLoadsDto), 
    loadController.acceptLoadsHandler
);

// Soft-delete a load (restricted to office staff or specific permission)
router.delete('/:id', 
    protect, 
    authorize(officeRoles, DELETE_LOAD_PERMISSION), 
    loadController.deleteLoadHandler
);


export default router;