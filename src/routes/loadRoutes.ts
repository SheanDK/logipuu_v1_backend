// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto } from '../dto/load.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();
const allowedRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä'];

// GET all loads
router.get('/', protect, authorize(allowedRoles), loadController.getAllLoadsHandler);

// GET a single load by its ID
router.get('/:id', protect, authorize(allowedRoles), loadController.getLoadByIdHandler);

// POST a new load
router.post('/', protect, authorize(allowedRoles), validateDto(CreateLoadDto), loadController.createLoadHandler);

// PUT (update) an existing load
router.put('/:id', protect, authorize(allowedRoles), validateDto(UpdateLoadDto, { skipMissingProperties: true }), loadController.updateLoadHandler);

// delete (delete) an existing load
router.delete('/:id', protect, authorize(allowedRoles), loadController.deleteLoadHandler);


export default router;