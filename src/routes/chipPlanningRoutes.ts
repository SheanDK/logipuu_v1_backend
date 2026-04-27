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
    approveLoadTransfer,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearReadNotifications,
    softDeleteChipLoad,
    bulkAcceptChipLoads,
    claimLoads,
    requestTransfer,
    searchChipInvoicingHandler,
    markChipLoadsAsBilled,
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

// 14. Approve/Reject Load Transfer
router.post('/approve-transfer-request', approveLoadTransfer);

// 15. Health Check
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 16. Get Notifications
router.get('/notifications/:userId', getNotifications);

// 17. Mark Notification as Read
router.put('/notifications/:notificationId/read', markNotificationAsRead);

// 18. Mark All Notifications as Read
router.put('/notifications/mark-all-read/:userId', markAllNotificationsAsRead);

// 19. Clear Read Notifications
router.delete('/notifications/clear-read/:userId', clearReadNotifications);

// 20. Bulk Accept Chip Loads
router.post('/bulk-accept', bulkAcceptChipLoads);

// 21. Claim loads for a driver
router.post('/claim-loads', claimLoads);

// 23. Request Load Transfer
router.post('/request-transfer', requestTransfer);

// 22. Soft Delete Chip Load
router.patch('/archive-load/:loadId', softDeleteChipLoad);

// 24. Search Loads for Invoicing
router.get('/invoicing/search', searchChipInvoicingHandler);

// 25. Confirm Invoicing (Mark as Billed)
router.post('/invoicing/confirm', markChipLoadsAsBilled);

// 26. Rename Group
router.put('/rename-group', renameGroup);
// 27. Delete Group
router.delete('/delete-group/:groupName', deleteGroup);
// 28. Update Vehicle Group
router.put('/update-vehicle-group', updateVehicleGroup);

export default router;
