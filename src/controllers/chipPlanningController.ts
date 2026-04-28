// backend/src/controllers/chipPlanningController.ts
import { Request, Response } from 'express';
import { chipPlanningService } from '../services/chipPlanningService';
import pool from '../config/db';
import { notificationService } from '../services/notificationService';
import { socketService } from '../services/socketService';

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

const getDriverOfVehicle = async (vehicleNumber: number): Promise<number | null> => {
    if (!vehicleNumber || isNaN(vehicleNumber)) {
        console.warn("⚠️ getDriverOfVehicle received invalid input:", vehicleNumber);
        return null;
    }

    const res = await pool.query(
        `SELECT kulj_id FROM public.kayttajat WHERE current_vehicle_id = $1 AND aktiivinen = true LIMIT 1`,
        [vehicleNumber]
    );
    return res.rows[0]?.kulj_id || res.rows[0]?.kuljId || null;
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

        if (Array.isArray(updatedRows) && updatedRows.length > 0) {
            const { socketService } = require('../services/socketService');
            updatedRows.forEach(row => socketService.emit('chipLoadUpdated', row));
            const firstLoadId = updatedRows[0].load_id || updatedRows[0].loadId;

            const targetDriverId = await getDriverOfVehicle(Number(kalustoNro));
            if (targetDriverId) {


                await notificationService.sendNotification(
                    targetDriverId,
                    'LOAD_ASSIGNED',
                    `New loads have been assigned to your schedule for Week ${week}.`,
                    Number(firstLoadId),
                    Number(kalustoNro)
                );
            } else {
                await notificationService.sendNotification(
                    -1,
                    'LOAD_ASSIGNED',
                    `New loads were assigned to Vehicle ${kalustoNro} for Week ${week}.`,
                    Number(firstLoadId),
                    Number(kalustoNro)
                );
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
        const currentDriverId = load.driver_user_id || load.driverUserId || await getDriverOfVehicle(Number(currentVehicleId));

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

// 6. move assigned load (FIXED for NaN error)
export const moveAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId, newKalustoNro, newDate } = req.body;

        // 1. මූලික පරාමිති පරීක්ෂා කිරීම (NaN දෝෂ වැළැක්වීමට)
        if (!loadId || !newKalustoNro || isNaN(Number(loadId)) || isNaN(Number(newKalustoNro))) {
            return res.status(400).json({ error: "Invalid Load ID or Vehicle Number provided." });
        }

        const load = await chipPlanningService.getLoadById(Number(loadId));
        if (!load) return res.status(404).json({ error: 'Load not found' });

        const previousStatus = load.status;
        const oldVehicleId = Number(load.vehicle_number || load.vehicleNumber);
        const targetVehicleId = Number(newKalustoNro);

        // 2. Database එකේ වාහනය සහ දිනය මාරු කිරීම
        const result = await chipPlanningService.moveLoadRecord(
            Number(loadId),
            targetVehicleId,
            newDate || load.scheduled_date || load.scheduledDate
        );

        // 🚀 FIX: දැනටමත් ඉහළින් import කර ඇති notificationService සහ socketService සෘජුවම භාවිතා කරන්න
        // (require('../services') යන පේළිය ඉවත් කළා)

        // 3. රියදුරන් සොයා ගැනීම
        const originalDriverId = await getDriverOfVehicle(oldVehicleId);
        const targetDriverId = await getDriverOfVehicle(targetVehicleId);

        // 4. Load එක දැනටමත් රියදුරුට යවා තිබුණේ නම් (DISPATCHED) පණිවිඩ යැවීම
        if (previousStatus === 'DISPATCHED') {

            // පැරණි රියදුරාට (Old Driver) දැනුම් දීම - වැඩේ ඉවත් වූ බව
            if (originalDriverId) {
                try {
                    await notificationService.sendNotification(
                        originalDriverId,
                        'LOAD_DELETED',
                        `Load ${loadId} was moved from your schedule to vehicle ${targetVehicleId}.`,
                        Number(loadId),
                        oldVehicleId
                    );
                } catch (e) { console.error("Old driver notification failed:", e); }
            }

            // අලුත් රියදුරාට (New Driver) දැනුම් දීම - අලුත් වැඩක් ලැබුණු බව
            if (targetDriverId) {
                try {
                    await notificationService.sendNotification(
                        targetDriverId,
                        'LOAD_ASSIGNED',
                        `New Load ${loadId} has been transferred to your vehicle from vehicle ${oldVehicleId}.`,
                        Number(loadId),
                        targetVehicleId
                    );
                } catch (e) { console.error("New driver notification failed:", e); }
            } else {
                // රියදුරෙකු නැත්නම් වාහනයට (General notification)
                await notificationService.sendNotification(0, 'LOAD_ASSIGNED', `Load ${loadId} assigned to Vehicle ${targetVehicleId}.`, Number(loadId), targetVehicleId);
            }
        }

        // Socket හරහා කාර්යාලයේ Grid එක update කිරීම
        socketService.emit('chipLoadUpdated', result);

        return res.status(200).json(result);

    } catch (error: any) {
        console.error("❌ moveAssignedLoad CRITICAL ERROR:", error.message);
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

// 13. set chip load 
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

// 13. set chip load
export const setChipLoad = async (req: Request, res: Response) => {
    try {
        const loadId = req.body.loadId ?? req.body.load_id;
        const actingUserId = (req as any).user?.driverNumericId;
        let isStatusChangingToSent = false;

        if (loadId) {
            const currentLoad = await chipPlanningService.getLoadById(Number(loadId));
            if (currentLoad) {
                const newStatus = req.body.status;
                if (currentLoad.status !== 'SENT' && newStatus === 'SENT') {
                    isStatusChangingToSent = true;
                }
            }
        }

        const row = await chipPlanningService.setChipLoad({ ...req.body, driver_user_id: actingUserId });

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', row);

        if (isStatusChangingToSent) {
            try {
                const { notificationService } = require('../services/notificationService');
                await notificationService.sendNotification(
                    0,
                    'LOAD_COMPLETED',
                    `Vehicle ${row.vehicle_number} has completed and sent Load ID: ${row.load_id}.`,
                    row.load_id,
                    row.vehicle_number
                );
            } catch (notifErr) {
                console.error('Failed to send notification to office:', notifErr);
            }
        }

        return res.status(loadId ? 200 : 201).json(row);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
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

        const targetVehicle = notif.vehicle_context_id || notif.vehicleContextId;

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

                await notificationService.sendNotification(0, 'TRANSFER_ACCEPTED', `Transfer Approved: Load ${loadId} moved to Vehicle ${targetVehicle}.`, loadId, targetVehicle);
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

// 25. Request Load Transfer (Driver to Driver)
export const requestTransfer = async (req: Request, res: Response) => {
    try {
        const { loadId, newVehicleNumber } = req.body;
        const actingUserId = (req as any).user?.driverNumericId;

        if (!loadId || !newVehicleNumber) {
            return res.status(400).json({ error: "loadId and newVehicleNumber are required." });
        }

        const load = await chipPlanningService.getLoadById(Number(loadId));
        if (!load) return res.status(404).json({ error: "Load not found" });

        // Update DB
        const updatedLoad = await chipPlanningService.updateLoadRecord(Number(loadId), {
            requested_user_id: actingUserId,
            transfer_status: 'PENDING',
            requested_vehicle_number: Number(newVehicleNumber)
        });

        // Find target driver
        const targetDriverId = await getDriverOfVehicle(Number(newVehicleNumber));

        if (targetDriverId) {
            const senderVehicleId = load.vehicle_number || load.vehicleNumber;
            await notificationService.sendNotification(
                targetDriverId,
                'REASSIGNMENT_REQUEST',
                `Vehicle ${senderVehicleId} wants to transfer Load ${loadId} to you.`,
                Number(loadId),
                Number(newVehicleNumber)
            );
        }

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', updatedLoad);

        res.status(200).json(updatedLoad);
    } catch (error: any) {
        console.error("requestTransfer ERROR:", error.message);
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
            // 🚀 FIX: camelCase naming වලට අනුකූලව දත්ත ලබා ගැනීම
            const recipientId = updatedNotif.recipientUserId || updatedNotif.recipient_user_id;
            const relatedId = updatedNotif.relatedId || updatedNotif.related_id;
            const vehicleCtx = updatedNotif.vehicleContextId || updatedNotif.vehicle_context_id;

            if (recipientId && recipientId !== 0) {
                if (updatedNotif.type === 'LOAD_ASSIGNED' || updatedNotif.type === 'LOAD_DELETED') {
                    const { notificationService } = require('../services/notificationService');

                    const driverRes = await pool.query('SELECT nimi FROM public.kayttajat WHERE kulj_id = $1', [Number(recipientId)]);
                    const driverName = driverRes.rows[0]?.nimi || `Driver #${recipientId}`;

                    const actionTxt = updatedNotif.type === 'LOAD_ASSIGNED' ? 'new assignment' : 'removal';
                    const loadIdValue = (relatedId && !isNaN(Number(relatedId))) ? relatedId : '';
                    const loadTxt = (relatedId && String(relatedId) !== 'undefined') ? ` for Load #${relatedId}` : '';

                    await notificationService.sendNotification(
                        0, // Office
                        'DRIVER_ACKNOWLEDGED',
                        `${driverName} acknowledged the ${actionTxt}${loadTxt}.`,
                        relatedId ? Number(relatedId) : null,
                        vehicleCtx
                    );
                }
            }
            return res.status(200).json(updatedNotif);
        } else {
            return res.status(200).json({ message: "Already read" });
        }
    } catch (error) {
        console.error("markNotificationAsRead ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
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

// 23.  Soft delete by marking as billed
export const softDeleteChipLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;

        const query = `
            UPDATE public.chip_loads 
            SET is_billed = true, billed_date = CURRENT_DATE 
            WHERE load_id = $1 
            RETURNING *;
        `;
        const result = await pool.query(query, [Number(loadId)]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Load not found" });
        }

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadDeleted', { loadId: Number(loadId) });

        res.status(200).json({ success: true, message: "Load archived successfully" });
    } catch (error) {
        console.error("Soft delete error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
// 24. Bulk Accept Controller
export const bulkAcceptChipLoads = async (req: Request, res: Response) => {
    try {
        const { loadIds } = req.body;
        const updated = await chipPlanningService.bulkAcceptChipLoads(loadIds);

        const { socketService } = require('../services/socketService');
        updated.forEach(row => socketService.emit('chipLoadUpdated', row));

        res.status(200).json({ success: true, count: updated.length });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 25. Controller to handle driver claiming the vehicle's loads
export const claimLoads = async (req: Request, res: Response) => {
    try {
        const { vehicleNumber, userId } = req.body;

        if (!vehicleNumber || !userId) {
            return res.status(400).json({ error: "Vehicle and User IDs are required." });
        }

        const updatedLoads = await chipPlanningService.claimVehicleLoads(Number(vehicleNumber), Number(userId));

        const claimedNotifs = await chipPlanningService.claimVehicleNotifications(Number(vehicleNumber), Number(userId));

        const { socketService } = require('../services/socketService');
        if (updatedLoads.length > 0 || (claimedNotifs && claimedNotifs.length > 0)) {
            socketService.emit('chipLoadUpdated', {
                vehicleNumber,
                claimedBy: userId,
                claimedNotificationsCount: claimedNotifs.length
            });
        }

        res.status(200).json({
            success: true,
            count: updatedLoads.length,
            claimedNotificationsCount: claimedNotifs ? claimedNotifs.length : 0
        });
    } catch (error) {
        console.error("claimLoads Error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 26. Search Loads for Invoicing
export const searchChipInvoicingHandler = async (req: Request, res: Response) => {
    try {
        const { dateFrom, dateTo, customerId, billed } = req.query;

        const filters = {
            status: billed === 'true' ? 'all' : 'pending_inspection',
            asiakasId: customerId,
            startDate: dateFrom,
            endDate: dateTo
        };

        const data = await chipPlanningService.searchLoads(filters);

        const payload = data.map((r: any) => ({
            // 🚀 FIX: snake_case සහ camelCase යන දෙවර්ගයම පරීක්ෂා කරයි
            loadId: r.loadId || r.load_id,
            scheduledDate: r.scheduledDate || r.scheduled_date,
            vehicleRegNo: r.vehicleRegNo || r.rekNro,
            customerName: r.customerName || r.asiakkaan_nimi,
            titleName: r.titleName || r.title_name,
            actualM3: Number(r.actualM3 || r.actual_m3 || 0),
            actualTon: Number(r.actualTon || r.actual_ton || 0),
            isBilled: r.isBilled || r.is_billed
        }));

        res.status(200).json(payload);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 27. Confirm Invoicing (Mark as Billed)
export const markChipLoadsAsBilled = async (req: Request, res: Response) => {
    try {
        const { loadIds } = req.body;

        if (!loadIds || !Array.isArray(loadIds) || loadIds.length === 0) {
            return res.status(400).json({ error: "Please select at least one load." });
        }

        const numericIds = loadIds.map(id => Number(id));
        const result = await chipPlanningService.bulkAcceptChipLoads(numericIds);

        const { socketService } = require('../services/socketService');
        socketService.emit('chipLoadUpdated', { action: 'INVOICED' });

        res.status(200).json({ success: true, count: result.length });
    } catch (error) {
        console.error("Bulk Invoicing Error:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

