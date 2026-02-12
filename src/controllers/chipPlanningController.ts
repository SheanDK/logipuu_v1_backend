//backend/src/controllers/chipPlanningController.ts
import { Request, Response } from 'express';
import { chipPlanningService } from '../services/chipPlanningService';

export const getWeeklyPlanning = async (req: Request, res: Response) => {
    try {
        const { week, year, shift } = req.query;
        if (!week || !year) return res.status(400).json({ error: 'Week and Year are required' });

        const rows = await chipPlanningService.getWeeklyPlanningData(
            Number(week), Number(year), String(shift || 'Morning')
        );
        if (!rows) return res.status(200).json([]);

        const formatted = rows.reduce((acc: any[], row: any) => {
            const rekNro = row.rekNro || row.reknro;
            const programId = row.programId || row.programid;

            if (!rekNro) return acc;

            let vehicle = acc.find(v => v.rekNro === rekNro);
            if (!vehicle) {
                vehicle = { programId, rekNro, driver: row.driverName || row.drivername, loads: [] };
                acc.push(vehicle);
            }

            if (row.loadId || row.loadid) {
                vehicle.loads.push({
                    loadId: row.loadId || row.loadid,
                    date: row.date,
                    status: row.status,
                    plannedM3: row.plannedM3 || row.plannedm3,
                    titleName: row.titleName || row.titlename,
                    lyhenne: row.lyhenne
                });
            }
            return acc;
        }, []);

        res.status(200).json(formatted);
    } catch (error: any) {
        console.error("PLANNING CONTROLLER CRASHED:", error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const assignTitleToVehicle = async (req: Request, res: Response) => {
    try {
        const { program_id, title_id, order_id, pvm, shift_type } = req.body;

        let finalTitleId = title_id;
        let lahtoId = null;
        let purkuId = null;

        // 1. Resolve Location and Title details
        if (order_id && order_id !== 0) {
            // SUBS පවරන විට - Order එක හරහා සියලුම විස්තර ලබා ගනී
            const orderInfo = await chipPlanningService.getOrderDetails(Number(order_id));
            if (!orderInfo) return res.status(404).json({ error: 'Order link to title not found' });
            finalTitleId = orderInfo.title_id;
            lahtoId = orderInfo.lahto_paikka_id;
            purkuId = orderInfo.purku_paikka_id;
        } else if (title_id && title_id !== 0) {
            // TITLES පවරන විට - සෘජුවම Title විස්තර ලබා ගනී
            const title = await chipPlanningService.getTitleDetails(Number(title_id));
            if (!title) return res.status(404).json({ error: 'Title not found' });
            lahtoId = title.lahto_paikka_id;
            purkuId = title.purku_paikka_id;
        } else {
            return res.status(400).json({ error: 'Either Title ID or Order ID is required' });
        }

        // 2. Create the Load Record
        const newLoad = await chipPlanningService.createLoadRecord({
            program_id: Number(program_id),
            title_id: Number(finalTitleId),
            order_id: (order_id && order_id !== 0) ? Number(order_id) : null,
            pvm,
            shift_type: shift_type || 'Morning',
            lahto_id: lahtoId,
            purku_id: purkuId
        });

        res.status(201).json(newLoad);
    } catch (error: any) {
        console.error("Assign Error LOG:", error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// අනෙකුත් functions එලෙසම පවතී
export const dispatchRow = async (req: Request, res: Response) => {
    try {
        const { programId } = req.body;
        await chipPlanningService.dispatchVehicleRow(Number(programId));
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateProgramDriver = async (req: Request, res: Response) => {
    try {
        const { programId, driverId } = req.body;
        await chipPlanningService.updateVehicleDriver(Number(programId), Number(driverId));
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const addVehicleToPlan = async (req: Request, res: Response) => {
    try {
        const { vehicleId, week, year } = req.body;
        const result = await chipPlanningService.addVehicleToWeeklyPlan(vehicleId, week, year);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;
        await chipPlanningService.deleteLoadRecord(Number(loadId));
        res.status(200).json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
};

export const updateAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId } = req.params;
        const result = await chipPlanningService.updateLoadRecord(Number(loadId), req.body);
        res.status(200).json(result);
    } catch (error) { res.status(500).json({ error: 'Internal server error' }); }
};

export const moveAssignedLoad = async (req: Request, res: Response) => {
    try {
        const { loadId, newProgramId, newDate } = req.body;
        const result = await chipPlanningService.moveLoadRecord(Number(loadId), Number(newProgramId), newDate);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};