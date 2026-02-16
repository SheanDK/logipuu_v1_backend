//backend/src/routes/chipPlanningRoutes.ts
import { Router } from 'express';
import {
    getWeeklyPlanning,
    assignTitleToVehicle,
    dispatchRow,
    updateAssignedLoad,
    deleteAssignedLoad,
    moveAssignedLoad,
    addVehicleToPlan
} from '../controllers/chipPlanningController';

const router = Router();

router.get('/weekly-view', getWeeklyPlanning);
router.post('/dispatch-row', dispatchRow);
router.put('/load/:loadId', updateAssignedLoad);
router.delete('/delete-load/:loadId', deleteAssignedLoad);
router.patch('/move-load', moveAssignedLoad);
router.post('/add-vehicle', addVehicleToPlan);
router.post('/assign', assignTitleToVehicle);

export default router;