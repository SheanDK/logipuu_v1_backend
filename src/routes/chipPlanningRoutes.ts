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
    getChipMapData
} from '../controllers/chipPlanningController';

const router = Router();

router.get('/weekly-view', getWeeklyPlanning);

router.post('/assign', assignTitleToVehicle);

router.post('/dispatch-row', dispatchRow);

router.put('/load/:loadId', updateAssignedLoad);

router.delete('/delete-load/:loadId', deleteAssignedLoad);

router.patch('/move-load', moveAssignedLoad);

router.post('/add-vehicle', addVehicleToPlan);

router.get('/map-data', getChipMapData);

export default router;