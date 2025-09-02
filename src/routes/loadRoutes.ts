// backend/src/routes/loadRoutes.ts
import { Router } from 'express';
import * as loadController from '../controllers/loadController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import { CreateLoadDto, UpdateLoadDto, UpdateLoadStatusDto } from '../dto/load.dto';
import { validateDto } from '../middlewares/validationMiddleware';

const router = Router();
const officeRoles = ['Superuser', 'Admin', 'Toimisto', 'Ajojärjestelijä'];
const driverRoles = ['Kuljettaja'];

// --- THIS IS THE FIX: Define specific string routes BEFORE variable routes ---

// === Driver Portal Routes ===
// This route '/my-loads' is more specific than '/:id', so it MUST come first.
router.get('/my-loads', protect, authorize(driverRoles), loadController.getMyLoadsHandler);

// === Office Staff Routes ===
// GET all loads (with filters)
router.get('/', protect, authorize(officeRoles), loadController.getAllLoadsHandler);

// GET a single load by its ID
// This is a variable route, so it comes AFTER more specific GET routes like '/my-loads'.
router.get('/:id', protect, authorize(officeRoles), loadController.getLoadByIdHandler);

// POST a new load
router.post('/', protect, authorize(officeRoles), validateDto(CreateLoadDto), loadController.createLoadHandler);

// PUT (update) an existing load
router.put('/:id', protect, authorize(officeRoles), validateDto(UpdateLoadDto, { skipMissingProperties: true }), loadController.updateLoadHandler);

// DELETE (soft delete) an existing load
router.delete('/:id', protect, authorize(officeRoles), loadController.deleteLoadHandler);

// === Driver Portal Routes ===
router.get('/my-loads', protect, authorize(driverRoles), loadController.getMyLoadsHandler);

// --- THIS IS THE NEW ROUTE FOR STATUS UPDATES ---
// We use PATCH because we are only partially updating the resource (just the status).
router.patch('/:id/status', protect, authorize(driverRoles), validateDto(UpdateLoadStatusDto), loadController.updateLoadStatusHandler);


export default router;