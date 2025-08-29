// backend/src/routes/unloadingSiteRoutes.ts
import { Router } from 'express';
import * as unloadingSiteController from '../controllers/unloadingSiteController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { validateDto } from '../middlewares/validationMiddleware';
import { CreateUnloadingSiteDto, UpdateUnloadingSiteDto, UpdateUnloadingSiteVisibilityDto } from '../dto/unloadingSite.dto';

const router = Router();

const allowedRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä']; // Adjust roles as needed

router.get('/', protect, authorize(allowedRoles), unloadingSiteController.getAllUnloadingSitesHandler);
router.get('/:id', protect, authorize(allowedRoles), unloadingSiteController.getUnloadingSiteByIdHandler);
router.get('/by-client/:clientId', protect, authorize(allowedRoles), unloadingSiteController.getUnloadingSitesByClientIdHandler);
router.get('/:id', protect, authorize(allowedRoles), unloadingSiteController.getUnloadingSiteByIdHandler);
router.patch('/:id/visibility', protect, authorize(allowedRoles), validateDto(UpdateUnloadingSiteVisibilityDto), unloadingSiteController.updateUnloadingSiteVisibilityHandler);
router.post('/', protect, authorize(allowedRoles), validateDto(CreateUnloadingSiteDto), unloadingSiteController.createUnloadingSiteHandler);
router.put('/:id', protect, authorize(allowedRoles), validateDto(UpdateUnloadingSiteDto), unloadingSiteController.updateUnloadingSiteHandler);
router.delete('/:id', protect, authorize(allowedRoles), unloadingSiteController.deleteUnloadingSiteHandler);

export default router;