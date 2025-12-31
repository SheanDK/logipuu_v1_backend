// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto, CompleteLoadDto, AcceptLoadsDto, CreateBulkLoadDto } from '../dto/load.dto';
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
const officeRoles = ['Superuser', 'Admin', 'Office', 'Ajärjestelijä'];
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

// --- NEW BULK CREATE ROUTE ---
// Create multiple loads (legs) in a single request.
// Placed before general routes like '/' and '/:id' to ensure correct matching.
router.post('/bulk', 
    protect, 
    authorize(allStaffRoles, CREATE_LOAD_PERMISSION),
    validateDto(CreateBulkLoadDto), 
    loadController.createBulkLoadHandler
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

// Create a new SINGLE load (can be done by both roles)
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

// Update a trip by its initial load ID
router.put('/trip/:initialLoadId',
    protect,
    authorize(driverRoles), // Only drivers can edit their trips
    loadController.updateTripHandler
);

router.patch('/trip/:ajomaaraysNro/status',
    protect,
    authorize(driverRoles),
    validateDto(UpdateLoadStatusDto),
    loadController.updateTripStatusHandler
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
    // FIX: Changed to allStaffRoles to allow drivers to delete their own 'Assigned' loads,
    // with the actual permission check happening in the service layer.
    authorize(allStaffRoles, DELETE_LOAD_PERMISSION), 
    loadController.deleteLoadHandler
);

export default router;