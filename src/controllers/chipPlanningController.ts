import { Request, Response } from 'express';
import { chipPlanningService } from '../services/chipPlanningService';
import pool from '../config/db';
import { notificationService } from '../services/notificationService';

const getIsoWeekAndYear = (date: Date): { week: number; year: number } => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { week, year: utcDate.getUTCFullYear() };
};

const getSingleQueryValue = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
    return undefined;
};

// Helper to get driver ID for a vehicle
const getDriverOfVehicle = async (vehicleNumber: number): Promise<number | null> => {
    const res = await pool.query(
        `SELECT kulj_id FROM public.kayttajat WHERE current_vehicle_id = $1 AND aktiivinen = true LIMIT 1`,
        [vehicleNumber]
    );
    return res.rows[0]?.kuljId || null;
};

// 1. get data
export const getWeeklyPlanning = async (req: Request, res: Response) => {
    try {
        const { week, year } = req.query;
        if (!week || !year) return res.status(400).json({ error: 'Week and Year are required' });

        const rows = await chipPlanningService.getWeeklyPlanningData(Number(week), Number(year));

        // group data by vehicle
        const formatted = rows.reduce((acc: any[], row: any) => {
            let vehicle = acc.find(v => v.kalustoNro === row.kalustoNro);
            if (!vehicle) {
                vehicle = {
                    kalustoNro: row.kalustoNro,
                    rekNro: row.rekNro,
                    loads: []
                };
                acc.push(vehicle);
            }
            if (row.loadId) {
                vehicle.loads.push(row);
            }
            return acc;
        }, []);

        res.status(200).json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// 2. assign title to vehicle
export const assignTitleToVehicle = async (req: Request, res: Response) => {
    try {
        const { kalusto_nro, title_id, order_id, pvm } = req.body;
        const newLoad = await chipPlanningService.createLoadRecord({
            vehicle_number: Number(kalusto_nro),
            title_id: Number(title_id),
            order_id: order_id ? Number(order_id) : null,
            scheduled_date: pvm
        });

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', newLoad);

        res.status(201).json(newLoad);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. dispatch vehicle row
export const dispatchRow = async (req: Request, res: Response) => {
    try {
        const { kalustoNro, week, year } = req.body;
        const updatedRows = await chipPlanningService.dispatchVehicleRow(Number(kalustoNro), Number(week), Number(year));

        const { socketService } = require('../services/socketService');
        if (Array.isArray(updatedRows) && updatedRows.length > 0) {
            updatedRows.forEach(row => socketService.emit('chipLoadUpdated', row));

            // Notify the driver that new loads are assigned
            try {
                const { notificationService } = require('../services/notificationService');
                const targetDriverId = await getDriverOfVehicle(Number(kalustoNro));
                if (targetDriverId) {
                    await notificationService.sendNotification(
                        targetDriverId,
                        'LOAD_ASSIGNED',
                        `New loads have been assigned to your schedule for Week ${week}.`,
                        null,
                        Number(kalustoNro)
                    );
                }
            } catch (e) {
                console.error('Failed to send assignment notification:', e);
            }
        }

        res.status(200).json({ success: true, count: updatedRows.length });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. update assigned load
export const updateAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;
        const load = await chipPlanningService.getLoadById(Number(loadId));
        if (!load) return res.status(404).json({ error: 'Load not found' });

        if (['LOADED', 'UNLOADED', 'SENT'].includes(load.status)) {
            return res.status(400).json({ error: 'Cannot update a load that is already in progress or completed.' });
        }

        const result = await chipPlanningService.updateLoadRecord(Number(loadId), req.body);

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', result);

        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 5. delete assigned load
export const deleteAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;
        const load = await chipPlanningService.getLoadById(Number(loadId));
        if (!load) return res.status(404).json({ error: 'Load not found' });

        if (['LOADED', 'UNLOADED', 'SENT'].includes(load.status)) {
            return res.status(400).json({ error: 'Cannot delete a load that is already in progress or completed.' });
        }

        const currentVehicleId = load.vehicle_number || load.vehicleNumber;
        const currentDriverId = await getDriverOfVehicle(Number(currentVehicleId));

        await chipPlanningService.deleteLoadRecord(Number(loadId));

        if (['DISPATCHED', 'NOT_SENT'].includes(load.status)) {
            try {
                const { notificationService } = require('../services/notificationService');
                const rawDate = load.scheduled_date || load.scheduledDate;
                const d = new Date(rawDate);
                const formattedDate = !isNaN(d.getTime())
                    ? `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
                    : String(rawDate);

                if (currentDriverId) {
                    await notificationService.sendNotification(
                        currentDriverId,
                        'LOAD_DELETED',
                        `A load scheduled on ${formattedDate} has been removed by the office.`,
                        Number(loadId),
                        Number(currentVehicleId)
                    );
                }
            } catch (err) { console.error('Notification error:', err); }
        }

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadDeleted', { loadId: Number(loadId) });

        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 6. move assigned load
// 6. move assigned load (UPDATED: Only notify if DISPATCHED)
export const moveAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId, newKalustoNro, newDate } = req.body;
        const load = await chipPlanningService.getLoadById(Number(loadId));

        if (!load) return res.status(404).json({ error: 'Load not found' });

        const previousStatus = load.status;
        const oldVehicleId = load.vehicle_number || load.vehicleNumber;

        // Execute the move in DB
        const result = await chipPlanningService.moveLoadRecord(Number(loadId), Number(newKalustoNro), newDate || load.scheduled_date || load.scheduledDate);

        const { socketService } = require('../services/socketService');
        const { notificationService } = require('../services/notificationService');

        // --- FIX: Only trigger Notifications/Popups if status was DISPATCHED ---
        if (previousStatus === 'DISPATCHED') {
            const originalDriverId = await getDriverOfVehicle(Number(oldVehicleId));
            const targetDriverId = await getDriverOfVehicle(Number(newKalustoNro));

            // Old driver gets a "Removed" popup
            if (originalDriverId) {
                await notificationService.sendNotification(
                    originalDriverId,
                    'LOAD_DELETED',
                    `Load ${loadId} was transferred from your schedule to another vehicle.`,
                    Number(loadId),
                    Number(oldVehicleId)
                );
            }

            // New driver gets an "Assigned" popup
            if (targetDriverId) {
                await notificationService.sendNotification(
                    targetDriverId,
                    'LOAD_ASSIGNED',
                    `New Load ${loadId} has been transferred to your vehicle.`,
                    Number(loadId),
                    Number(newKalustoNro)
                );
            }
        }

        socketService.emit('chipLoadUpdated', result);
        return res.status(200).json(result);

    } catch (error: any) {
        console.error("moveAssignedLoad ERROR:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 7. add vehicle to plan
export const addVehicleToPlan = async (req: Request, res: Response) => {
    try {
        const { vehicleId, week, year } = req.body;
        const result = await chipPlanningService.addVehicleToWeeklyPlan(Number(vehicleId), Number(week), Number(year));
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 8. get map data
export const getChipMapData = async (req: Request, res: Response) => {
    try {
        const markers = await chipPlanningService.getChipMapMarkers();
        res.status(200).json(markers);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 9. Rename Group
export const renameGroup = async (req: Request, res: Response) => {
    try {
        const { oldName, newName } = req.body;
        await chipPlanningService.renameGroup(oldName, newName);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 10. Delete Group
export const deleteGroup = async (req: Request, res: Response) => {
    try {
        const { groupName } = req.params;
        await chipPlanningService.deleteGroup(groupName as string);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 11. Update Vehicle Group
export const updateVehicleGroup = async (req: Request, res: Response) => {
    try {
        const { kalustoNro, groupName } = req.body;
        await chipPlanningService.updateVehicleGroup(Number(kalustoNro), groupName);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
// 12. get chip loads by week (current ISO week by default)
export const getChipLoadsByWeek = async (req: Request, res: Response) => {
    try {
        const weekQuery = getSingleQueryValue(req.query.week);
        const yearQuery = getSingleQueryValue(req.query.year);
        const vehicleNumberQuery = getSingleQueryValue(req.query.vehicleNumber) ?? getSingleQueryValue(req.query.vehicle_number);

        if ((weekQuery && !yearQuery) || (!weekQuery && yearQuery)) {
            return res.status(400).json({ error: 'Provide both week and year, or neither.' });
        }

        const now = new Date();
        const currentIso = getIsoWeekAndYear(now);

        const week = weekQuery ? Number(weekQuery) : currentIso.week;
        const year = yearQuery ? Number(yearQuery) : currentIso.year;

        if (!Number.isInteger(week) || week < 1 || week > 53) {
            return res.status(400).json({ error: 'Week must be an integer between 1 and 53.' });
        }
        if (!Number.isInteger(year) || year < 1) {
            return res.status(400).json({ error: 'Year must be a positive integer.' });
        }

        let vehicleNumber: number | undefined;
        if (vehicleNumberQuery !== undefined) {
            vehicleNumber = Number(vehicleNumberQuery);
            if (!Number.isInteger(vehicleNumber) || vehicleNumber < 0) {
                return res.status(400).json({ error: 'vehicleNumber/vehicle_number must be a non-negative integer.' });
            }
        }

        const rows = await chipPlanningService.getChipLoadsByWeek(week, year, vehicleNumber);
        return res.status(200).json(rows);
    } catch (error: any) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// 13. set chip load (create or update)
// Driver-only metric fields: allowed to update even on LOADED/UNLOADED loads
const DRIVER_METRIC_KEYS = new Set([
    'actual_ton', 'actualTon',
    'actual_m3', 'actualM3',
    'actual_pcs', 'actualPcs',
    'actual_hr', 'actualHr',
    'actual_km', 'actualKm',
    'actual_waiting', 'actualWaiting',
    'actual_details', 'actualDetails',
    'started_at', 'startedAt',
    'completed_at', 'completedAt',
    'is_sent_from_app', 'isSentFromApp',
    'status',
    'loadId', 'load_id'
]);

// 13. set chip load (create or update)
export const setChipLoad = async (req: Request, res: Response) => {
    try {
        const loadId = req.body.loadId ?? req.body.load_id;
        let isStatusChangingToSent = false;

        if (loadId) {
            const currentLoad = await chipPlanningService.getLoadById(Number(loadId));

            if (currentLoad) {
                // 1. check if status is changing to 'SENT' (Notification Trigger)
                const newStatus = req.body.status;
                if (currentLoad.status !== 'SENT' && newStatus === 'SENT') {
                    isStatusChangingToSent = true;
                }

                // 2. check structural changes (Metric keys validation)
                if (['LOADED', 'UNLOADED', 'SENT'].includes(currentLoad.status)) {
                    const bodyKeys = Object.keys(req.body);
                    const isMetricsOnlyUpdate = bodyKeys.every(k => DRIVER_METRIC_KEYS.has(k));
                    if (!isMetricsOnlyUpdate) {
                        return res.status(400).json({ error: 'Cannot make structural changes to a load that is already in progress or completed.' });
                    }
                }
            }
        }

        const titleId = req.body.titleId ?? req.body.title_id;
        const vehicleNumber = req.body.vehicleNumber ?? req.body.vehicle_number;
        const scheduledDate = req.body.scheduledDate ?? req.body.scheduled_date;

        if (!loadId) {
            if (titleId === undefined || vehicleNumber === undefined || !scheduledDate) {
                return res.status(400).json({
                    error: 'titleId/title_id, vehicleNumber/vehicle_number and scheduledDate/scheduled_date are required when creating a load.'
                });
            }
        }

        // update the database
        const row = await chipPlanningService.setChipLoad(req.body);

        // update the table via socket
        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', row);

        // 3. if driver send the load, send notification to office
        if (isStatusChangingToSent) {
            try {
                const { notificationService } = require('../services/notificationService');
                await notificationService.sendNotification(
                    0,
                    'LOAD_COMPLETED',
                    `Vehicle ${row.vehicleNumber} has completed and sent Load ID: ${row.loadId}. Ready for invoicing.`,
                    row.loadId
                );
                console.log(`📢 Real-time notification sent to Office for load: ${row.loadId}`);
            } catch (notifErr) {
                console.error('Failed to send real-time notification to office:', notifErr);
            }
        }

        return res.status(loadId ? 200 : 201).json(row);
    } catch (error: any) {
        if (error?.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Chip load not found.' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// 14. get driver chip loads
export const getDriverChipLoads = async (req: Request, res: Response) => {
    try {
        const { vehicleNumber, week, year } = req.query;
        const data = await chipPlanningService.getDriverLoads(Number(vehicleNumber), Number(week), Number(year));
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: "Failed to fetch loads" }); }
};

// 15. set load metrics
export const setLoadMetrics = async (req: Request, res: Response) => {
    try {
        const { loadId, ...metrics } = req.body;
        const data = await chipPlanningService.updateLoadMetrics(loadId, metrics);
        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', data);

        res.status(200).json(data);
    } catch (error) { res.status(500).json({ error: "Failed to update load" }); }
};

// 16. search chip loads
export const searchChipLoadsHandler = async (req: Request, res: Response) => {
    try {
        const data = await chipPlanningService.searchLoads(req.query);
        res.status(200).json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 17. Approve/Reject Load Transfer
export const approveLoadTransfer = async (req: Request, res: Response) => {
    try {
        const { loadId, approve, notificationId } = req.body;

        console.log(`[Approval Request] Load: ${loadId}, Notif: ${notificationId}, Approve: ${approve}`);

        if (!loadId || !notificationId) {
            return res.status(400).json({ error: "loadId and notificationId are required." });
        }

        const notifRes = await pool.query('SELECT * FROM public.notifications WHERE notification_id = $1', [Number(notificationId)]);
        const notif = notifRes.rows[0];

        if (!notif) {
            return res.status(400).json({ error: "Notification record not found." });
        }

        const targetVehicle = notif.vehicleContextId;

        const loadResult = await pool.query('SELECT * FROM public.chip_loads WHERE load_id = $1', [Number(loadId)]);
        if (loadResult.rows.length === 0) return res.status(404).json({ error: "Load not found" });

        const load = loadResult.rows[0];

        if (approve) {
            if (!targetVehicle) {
                console.error("❌ ERROR: Target vehicle is missing in notification context!");
                return res.status(400).json({ error: "Target vehicle info missing. Please contact Admin." });
            }

            const updatedLoad = await chipPlanningService.updateLoadRecord(Number(loadId), {
                vehicle_number: targetVehicle,
                requested_user_id: null,
                transfer_status: 'ACCEPTED',
                status: 'DISPATCHED'
            });

            await chipPlanningService.markNotificationAsRead(Number(notificationId));

            try {
                const newDriverId = await getDriverOfVehicle(targetVehicle);
                if (newDriverId) {
                    await notificationService.sendNotification(newDriverId, 'LOAD_ASSIGNED', `New load assigned: Load ${loadId} was transferred to you.`, loadId, targetVehicle);
                }

                await notificationService.sendNotification(0, 'TRANSFER_ACCEPTED', `Transfer Approved: Load ${loadId} moved to Vehicle ${targetVehicle}.`, loadId);
            } catch (err) { console.error('Notification logic error:', err); }

            const { socketService } = require('../services/socketService');
            socketService.emit('chipLoadUpdated', updatedLoad);

            res.status(200).json({ message: "Transfer completed", data: updatedLoad });
        }
        else {
            await chipPlanningService.updateLoadRecord(Number(loadId), {
                requested_user_id: null,
                transfer_status: 'REJECTED'
            });

            await chipPlanningService.markNotificationAsRead(Number(notificationId));

            await notificationService.sendNotification(0, 'TRANSFER_REJECTED', `Owner rejected transfer for Load ${loadId}`, loadId);

            const { socketService } = require('../services/socketService');
            socketService.emit('chipLoadUpdated', { loadId });

            res.status(200).json({ message: "Transfer rejected by owner" });
        }
    } catch (error: any) {
        console.error("❌ approveLoadTransfer CRITICAL ERROR:", error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// 18. get notifications
export const getNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const data = await chipPlanningService.getNotifications(Number(userId));
        res.status(200).json(data);
    } catch (error: any) {
        console.error("getNotifications ERROR:", error.message);
        res.status(500).json({ error: "Failed to fetch notifications" });
    }
};
// 19. mark notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
    try {
        const { notificationId } = req.params;

        const updatedNotif = await chipPlanningService.markNotificationAsRead(Number(notificationId));

        if (updatedNotif) {

            const recipientId = updatedNotif.recipient_user_id || updatedNotif.recipientUserId;
            const relatedId = updatedNotif.related_id || updatedNotif.relatedId;
            const vehicleCtx = updatedNotif.vehicle_context_id || updatedNotif.vehicleContextId;

            if (recipientId && recipientId !== 0) {
                if (updatedNotif.type === 'LOAD_ASSIGNED' || updatedNotif.type === 'LOAD_DELETED') {
                    const { notificationService } = require('../services/notificationService');

                    const driverRes = await pool.query('SELECT nimi, tunnus FROM public.kayttajat WHERE kulj_id = $1', [Number(recipientId)]);
                    const driverName = driverRes.rows[0]?.nimi || driverRes.rows[0]?.tunnus || `Driver #${recipientId}`;

                    const actionTxt = updatedNotif.type === 'LOAD_ASSIGNED' ? 'new assignment' : 'removal';
                    const loadTxt = relatedId ? ` for Load ${relatedId}` : '';

                    await notificationService.sendNotification(
                        0,
                        'DRIVER_ACKNOWLEDGED',
                        `${driverName} acknowledged the ${actionTxt}${loadTxt}.`,
                        relatedId,
                        vehicleCtx
                    );
                }
            }
            return res.status(200).json(updatedNotif);
        } else {
            return res.status(200).json({ message: "Already acknowledged" });
        }
    } catch (error) {
        console.error("markNotificationAsRead ERROR:", error);
        res.status(500).json({ error: "Failed to update notification" });
    }
};

// 20. mark all notifications as read
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const data = await chipPlanningService.markAllNotificationsAsRead(Number(userId));
        res.status(200).json(data);
    } catch (error) {
        console.error("markAllNotificationsAsRead ERROR:", error);
        res.status(500).json({ error: "Failed to update notifications" });
    }
};

// 21. get pending transfer requests
export const getPendingTransferRequests = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const data = await chipPlanningService.getPendingTransferRequests(Number(userId));
        res.status(200).json(data);
    } catch (error) {
        console.error("getPendingTransferRequests ERROR:", error);
        res.status(500).json({ error: "Failed to fetch pending transfers" });
    }
};

// 22. clear read notifications
export const clearReadNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const data = await chipPlanningService.clearReadNotifications(Number(userId));
        res.status(200).json(data);
    } catch (error) {
        console.error("clearReadNotifications ERROR:", error);
        res.status(500).json({ error: "Failed to clear notifications" });
    }
};

function dayjs(arg0: any) {
    throw new Error('Function not implemented.');
}
