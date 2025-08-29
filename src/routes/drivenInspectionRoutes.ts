import { Router } from 'express';
import * as controller from '../controllers/drivenInspectionController';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';

const router = Router();
// Define roles that can access this page
const viewRoles = ['Superuser', 'Admin', 'Toimisto'];
const editRoles = ['Superuser', 'Admin', 'Toimisto'];

// --- CORRECTED ROUTE ORDER ---
// Specific static routes should come first.

// Handles GET /api/driven-inspection/list
router.get('/list', protect, authorize(viewRoles), controller.getListHandler);

// Handles POST /api/driven-inspection/accept
router.post('/accept', protect, authorize(editRoles), controller.acceptEntriesHandler);

// --- MOVED UP: The new 'create' route. It's more specific than '/:id'. ---
// Handles POST /api/driven-inspection
router.post('/', protect, authorize(editRoles), controller.createHandler);

// Dynamic routes with parameters should come after static routes.

// Handles PUT /api/driven-inspection/:id
router.put('/:id', protect, authorize(editRoles), controller.updateRowHandler);

// Handles DELETE /api/driven-inspection/:id
router.delete('/:id', protect, authorize(editRoles), controller.deleteEntryHandler);

export default router;