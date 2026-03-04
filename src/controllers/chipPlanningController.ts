// backend/src/controllers/chipPlanningController.ts
import { Request, Response } from 'express';
import { chipPlanningService } from '../services/chipPlanningService';

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
        res.status(201).json(newLoad);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. dispatch vehicle row
export const dispatchRow = async (req: Request, res: Response) => {
    try {
        const { kalustoNro, week, year } = req.body;
        await chipPlanningService.dispatchVehicleRow(Number(kalustoNro), Number(week), Number(year));
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. update assigned load
export const updateAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;
        const result = await chipPlanningService.updateLoadRecord(Number(loadId), req.body);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 5. delete assigned load
export const deleteAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;
        await chipPlanningService.deleteLoadRecord(Number(loadId));
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 6. move assigned load
export const moveAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId, newKalustoNro, newDate } = req.body;
        const result = await chipPlanningService.moveLoadRecord(Number(loadId), Number(newKalustoNro), newDate);
        res.status(200).json(result);
    } catch (error: any) {
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

// 9. get chip loads by week (current ISO week by default)
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

// 10. set chip load (create or update)
export const setChipLoad = async (req: Request, res: Response) => {
    try {
        const loadId = req.body.loadId ?? req.body.load_id;
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

        const row = await chipPlanningService.setChipLoad(req.body);
        return res.status(loadId ? 200 : 201).json(row);
    } catch (error: any) {
        if (error?.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'Chip load not found.' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};
