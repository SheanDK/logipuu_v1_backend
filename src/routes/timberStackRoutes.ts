// backend/src/routes/timberStackRoutes.ts
import { Router } from 'express';
import * as timberStackController from '../controllers/timberStackController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateTimberStackDto, UpdateTimberStackLocationDto } from '../dto/timberStack.dto';

const router = Router();
const allowedRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä'];

// --- ROUTE ORDER FIX ---
// Specific routes should come BEFORE dynamic routes (like /:id)

// Base routes for the collection
router.get('/', protect, authorize(allowedRoles), timberStackController.getAllTimberStacksHandler);
router.post('/', protect, authorize(allowedRoles), validateDto(CreateTimberStackDto), timberStackController.createTimberStackHandler);

// Custom specific route for the list view
router.get(
    '/list', 
    protect, 
    authorize(allowedRoles), 
    timberStackController.getTimberStackListHandler
);

// Specific routes for a single resource that have extra path segments
router.get('/:id/full', protect, authorize(allowedRoles), timberStackController.getTimberStackFullDetailsHandler);
router.put('/:id/full', protect, authorize(allowedRoles), timberStackController.updateTimberStackFullHandler);
router.get('/:id/timber-types', protect, authorize(allowedRoles), timberStackController.getTimberTypesForStackHandler);
router.patch(
    '/:id/location', 
    protect, 
    authorize(allowedRoles), 
    validateDto(UpdateTimberStackLocationDto), 
    timberStackController.updateTimberStackLocationHandler
);

// Generic routes for a single resource (these should come last)
router.get('/:id', protect, authorize(allowedRoles), timberStackController.getTimberStackByIdHandler);
router.delete('/:id', protect, authorize(allowedRoles), timberStackController.deleteTimberStackHandler);

router.get(
    '/active/by-client/:clientId', 
    protect, 
    authorize(allowedRoles), 
    timberStackController.getActiveTimberStacksByClientHandler
);

router.get(
    '/:id/wood-entries', 
    protect, 
    authorize(allowedRoles), 
    timberStackController.getWoodEntriesByPuulaaniIdHandler
);

// --- REMOVED DUPLICATE ROUTES FROM THE END OF THE FILE ---

export default router;