// backend/src/routes/driverViewRoutes.ts
import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/rbacMiddleware';
import * as driverViewController from '../controllers/driverViewController';

const router = Router();
const driverRoles = ['Kuljettaja'];

// 1. A dedicated route for fetching all data needed for the driver's map view
router.get(
    '/map-locations',
    protect,
    authorize(driverRoles), // Only users with the 'Kuljettaja' role can access this
    driverViewController.getMapDataHandler
);

// 2. Get load for edit
router.get(
    '/load-for-edit/:id',
    protect,
    authorize(driverRoles),
    driverViewController.getLoadForEditHandler
);

// 3. Get active trip
router.get(
    '/active-trip',
    protect,
    authorize(driverRoles),
    driverViewController.getActiveTripHandler
);

// 4. Update timber entry status
router.put(
    '/puulaani/:id/statuses',
    protect,
    authorize(driverRoles),
    driverViewController.updateTimberEntryStatusHandler
);

// 5. Get completed trip by ID
router.get(
    '/completed-trips/:id',
    protect,
    authorize(driverRoles),
    driverViewController.getCompletedTripByIdHandler
);


export default router;