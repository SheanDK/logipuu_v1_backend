// backend/src/routes/unloadingSiteRoutes.ts
import { Router } from 'express';
import * as unloadingSiteController from '../controllers/unloadingSiteController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateUnloadingSiteDto, UpdateUnloadingSiteDto, UpdateUnloadingSiteVisibilityDto } from '../dto/unloadingSite.dto';

const router = Router();

// --- Define permissions for each action ---
// This makes the code cleaner and easier to manage.
const VIEW_PERMISSION = ['unloading_site_view'];
const CREATE_PERMISSION = ['unloading_site_create'];
const EDIT_PERMISSION = ['unloading_site_edit'];
const DELETE_PERMISSION = ['unloading_site_delete'];

// Drivers and Office Staff need to view the list for dropdowns
const allStaffWithViewPermission = ['Superuser', 'Admin', 'Office', 'Ajojärjestelijä', 'Kuljettaja'];

// --- GET Routes ---
// Anyone with 'unloading_site_view' permission can access these.
// We use the role array as a fallback/additional check.
router.get('/', 
    protect, 
    authorize(allStaffWithViewPermission, VIEW_PERMISSION), 
    unloadingSiteController.getAllUnloadingSitesHandler
);

router.get('/by-client/:clientId', 
    protect, 
    authorize(allStaffWithViewPermission, VIEW_PERMISSION), 
    unloadingSiteController.getUnloadingSitesByClientIdHandler
);

// This route should come after more specific ones like '/by-client/:clientId'
router.get('/:id', 
    protect, 
    authorize(allStaffWithViewPermission, VIEW_PERMISSION), 
    unloadingSiteController.getUnloadingSiteByIdHandler
);


// --- POST, PUT, PATCH, DELETE Routes (Modification actions) ---
// These are more sensitive and should be restricted to users with specific modification permissions.

router.post('/', 
    protect, 
    authorize([], CREATE_PERMISSION), 
    validateDto(CreateUnloadingSiteDto), 
    unloadingSiteController.createUnloadingSiteHandler
);

router.put('/:id', 
    protect, 
    authorize([], EDIT_PERMISSION), 
    validateDto(UpdateUnloadingSiteDto, { skipMissingProperties: true }), 
    unloadingSiteController.updateUnloadingSiteHandler
);

router.patch('/:id/visibility', 
    protect, 
    authorize([], EDIT_PERMISSION), // Editing visibility is an edit action
    validateDto(UpdateUnloadingSiteVisibilityDto), 
    unloadingSiteController.updateUnloadingSiteVisibilityHandler
);

router.delete('/:id', 
    protect, 
    authorize([], DELETE_PERMISSION), 
    unloadingSiteController.deleteUnloadingSiteHandler
);

export default router;