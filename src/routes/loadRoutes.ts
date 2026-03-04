// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto, CompleteLoadDto, AcceptLoadsDto, CreateBulkLoadDto } from '../dto/load.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();

// 1. Define Permissions
const VIEW_LOAD_PERMISSION = ['load management_view'];
const CREATE_LOAD_PERMISSION = ['load management_create'];
const EDIT_LOAD_PERMISSION = ['load management_edit'];
const DELETE_LOAD_PERMISSION = ['load management_delete'];
const INSPECTION_VIEW_PERMISSION = ['driven & inspection_view'];
const INSPECTION_ACCEPT_PERMISSION = ['driven & inspection_accept'];

// 2. Define Roles
const officeRoles = ['Superuser', 'Admin', 'Office', 'Ajärjestelijä'];
const driverRoles = ['Kuljettaja'];
const allStaffRoles = [...officeRoles, ...driverRoles];


// ===================================================
// MOST SPECIFIC ROUTES FIRST
// ===================================================

// 3. DRIVER PORTAL
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

// 4. OFFICE PORTAL
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

// 5. NEW BULK CREATE ROUTE

router.post('/bulk',
    protect,
    authorize(allStaffRoles, CREATE_LOAD_PERMISSION),
    validateDto(CreateBulkLoadDto),
    loadController.createBulkLoadHandler
);


// ===================================================
// GENERAL & DYNAMIC ROUTES
// ===================================================

// 6. GET a list of all loads (with filters) for the main management table
router.get('/',
    protect,
    authorize(officeRoles, VIEW_LOAD_PERMISSION),
    loadController.getAllLoadsHandler
);

// 7. Create a new SINGLE load (can be done by both roles)
router.post('/',
    protect,
    authorize(allStaffRoles, CREATE_LOAD_PERMISSION),
    validateDto(CreateLoadDto),
    loadController.createLoadHandler
);

// 8. GET the full details of a single load by its ID
router.get('/:id',
    protect,
    authorize(allStaffRoles, VIEW_LOAD_PERMISSION),
    loadController.getLoadByIdHandler
);

// 9. Update an existing load's details
router.put('/:id',
    protect,
    authorize(allStaffRoles, EDIT_LOAD_PERMISSION),
    validateDto(UpdateLoadDto, { skipMissingProperties: true }),
    loadController.updateLoadHandler
);

// 10. Update a trip by its initial load ID
router.put('/trip/:initialLoadId',
    protect,
    authorize(driverRoles),
    loadController.updateTripHandler
);

router.patch('/trip/:ajomaaraysNro/status',
    protect,
    authorize(driverRoles),
    validateDto(UpdateLoadStatusDto),
    loadController.updateTripStatusHandler
);

// 11. Update a load's status
router.patch('/:id/status',
    protect,
    authorize(driverRoles),
    validateDto(UpdateLoadStatusDto),
    loadController.updateLoadStatusHandler
);

// 12. Complete a trip
router.patch('/:id/complete',
    protect,
    authorize(driverRoles),
    validateDto(CompleteLoadDto),
    loadController.completeLoadHandler
);

// 13. Soft-delete a load
router.delete('/:id',
    protect,
    authorize(allStaffRoles, DELETE_LOAD_PERMISSION),
    loadController.deleteLoadHandler
);

export default router;