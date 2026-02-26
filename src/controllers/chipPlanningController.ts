// backend/src/controllers/chipPlanningController.ts
import { Request, Response } from 'express';
import { chipPlanningService } from '../services/chipPlanningService';

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