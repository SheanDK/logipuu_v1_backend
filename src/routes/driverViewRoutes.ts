// backend/src/routes/driverViewRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import * as driverViewController from '../controllers/driverViewController';

const router = Router();
const driverRoles = ['Kuljettaja'];

// A dedicated route for fetching all data needed for the driver's map view
router.get(
    '/map-locations',
    protect,
    authorize(driverRoles), // Only users with the 'Kuljettaja' role can access this
    driverViewController.getMapDataHandler
);

// --- THIS IS THE NEW ROUTE, ADDED TO THIS FILE ---
// The URL will be /api/driver/load-for-edit/:id
router.get(
    '/load-for-edit/:id',
    protect,
    authorize(driverRoles),
    driverViewController.getLoadForEditHandler
);

// Add this route to the file
router.get(
    '/active-trip',
    protect,
    authorize(driverRoles),
    driverViewController.getActiveTripHandler
);

router.put(
    '/puulaani/:id/statuses',
    protect,
    authorize(driverRoles),
    driverViewController.updateTimberEntryStatusHandler
);

export default router;