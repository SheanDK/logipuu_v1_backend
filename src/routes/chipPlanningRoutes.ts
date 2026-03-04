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
    renameGroup,
    deleteGroup,
    updateVehicleGroup
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

// 9. Rename Group
router.put('/rename-group', renameGroup);

// 10. Delete Group
router.delete('/delete-group/:groupName', deleteGroup);

// 11. Update Vehicle Group
router.put('/update-vehicle-group', updateVehicleGroup);

export default router;