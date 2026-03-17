//backend/src/routes/chipPlanningRoutes.ts
import { Router } from 'express';
import {
    getWeeklyPlanning,
    assignTitleToVehicle,
    dispatchRow,
    updateAssignedLoad,
    deleteAssignedLoad,
    moveAssignedLoad,
    addVehicleToPlan,
    getChipMapData,
    getChipLoadsByWeek,
    setChipLoad,
    getDriverChipLoads,
    setLoadMetrics,
    searchChipLoadsHandler,
} from '../controllers/chipPlanningController';

const router = Router();

// 1. Get Weekly Planning
router.get('/weekly-view', getWeeklyPlanning);

// 2. Assign Title to Vehicle
router.post('/assign', assignTitleToVehicle);

// 3. Dispatch Row
router.post('/dispatch-row', dispatchRow);

// 4. Update Assigned Load
router.put('/load/:loadId', updateAssignedLoad);

// 5. Delete Assigned Load
router.delete('/delete-load/:loadId', deleteAssignedLoad);

// 6. Move Assigned Load
router.patch('/move-load', moveAssignedLoad);

// 7. Add Vehicle to Plan
router.post('/add-vehicle', addVehicleToPlan);

// 8. Get Chip Map Data
router.get('/map-data', getChipMapData);

// 9. get chip loads by week (current ISO week by default)
router.get('/loads', getChipLoadsByWeek);

// 10. set chip load (create or update)
router.post('/set-load', setChipLoad);

// 11. Get Driver Chip Loads
router.get('/driver-loads', getDriverChipLoads);

// 12. Set Load Metrics
router.post('/set-metrics', setLoadMetrics);

// 13. Search Chip Loads
router.get('/search', searchChipLoadsHandler);

export default router;
