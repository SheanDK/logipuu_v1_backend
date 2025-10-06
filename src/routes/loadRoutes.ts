// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto, CompleteLoadDto, AcceptLoadsDto } from '../dto/load.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();

// --- Define Permissions ---
const VIEW_LOAD_PERMISSION = ['load management_view'];
const CREATE_LOAD_PERMISSION = ['load management_create'];
const EDIT_LOAD_PERMISSION = ['load management_edit'];
const DELETE_LOAD_PERMISSION = ['load management_delete'];
const INSPECTION_VIEW_PERMISSION = ['driven & inspection_view'];
const INSPECTION_ACCEPT_PERMISSION = ['driven & inspection_accept'];

// --- Define Roles ---
const officeRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles];


// ===================================================
// MOST SPECIFIC ROUTES FIRST
// ===================================================

// --- DRIVER PORTAL ---
router.get('/my-loads/completed-trips',
    protect,
    authorize(driverRoles),
    loadController.getMyCompletedLoadsHandler
);

// --- THIS IS THE NEW ROUTE ---
router.get('/my-loads/last-completed',
    protect,
    authorize(driverRoles),
    loadController.getMyLastCompletedLoadHandler
);

router.get('/my-loads', 
    protect, 
    authorize(driverRoles), 
    loadController.getMyLoadsHandler
);

// --- OFFICE PORTAL ---
router.get('/for-inspection',
    protect,
    authorize(officeRoles, INSPECTION_VIEW_PERMISSION),
    loadController.getLoadsForInspectionHandler
);

router.get('/active-trips',
    protect,
    authorize(officeRoles, VIEW_LOAD_PERMISSION),
    loadController.getActiveTripsForMapHandler
);

router.post('/accept-for-invoicing', 
    protect, 
    authorize(officeRoles, INSPECTION_ACCEPT_PERMISSION), 
    validateDto(AcceptLoadsDto), 
    loadController.acceptLoadsHandler
);


// ===================================================
// GENERAL & DYNAMIC ROUTES
// ===================================================

// GET a list of all loads (with filters) for the main management table
router.get('/', 
    protect, 
    authorize(officeRoles, VIEW_LOAD_PERMISSION), 
    loadController.getAllLoadsHandler
);

// Create a new load (can be done by both roles)
router.post('/', 
    protect, 
    authorize(allStaffRoles, CREATE_LOAD_PERMISSION),
    validateDto(CreateLoadDto), 
    loadController.createLoadHandler
);

// GET the full details of a single load by its ID
router.get('/:id', 
    protect, 
    authorize(allStaffRoles, VIEW_LOAD_PERMISSION), // Allow drivers to view their own loads
    loadController.getLoadByIdHandler
);

// Update an existing load's details
router.put('/:id', 
    protect, 
    authorize(allStaffRoles, EDIT_LOAD_PERMISSION), // Allow drivers to edit their own loads (service layer restricts fields)
    validateDto(UpdateLoadDto, { skipMissingProperties: true }), 
    loadController.updateLoadHandler
);

// It uses the initial load ID as a parameter to find the trip
router.put('/trip/:initialLoadId',
    protect,
    authorize(driverRoles), // Only drivers can edit their trips
    loadController.updateTripHandler
);

// Update a load's status
router.patch('/:id/status', 
    protect, 
    authorize(driverRoles), 
    validateDto(UpdateLoadStatusDto), 
    loadController.updateLoadStatusHandler
);

// Complete a trip
router.patch('/:id/complete',
    protect,
    authorize(driverRoles),
    validateDto(CompleteLoadDto),
    loadController.completeLoadHandler
);

// Soft-delete a load
router.delete('/:id', 
    protect, 
    authorize(officeRoles, DELETE_LOAD_PERMISSION), 
    loadController.deleteLoadHandler
);

export default router;