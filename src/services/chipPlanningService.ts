// backend/src/services/chipPlanningService.ts
import pool from '../config/db';

export const chipPlanningService = {
    getWeeklyPlanningData: async (week: number, year: number, shift: string) => {
        const query = `
        SELECT 
            wp.program_id as "programId", 
            k.rek_nro as "rekNro", 
            d.nimi as "driverName",
            cl.load_id as "loadId", 
            TO_CHAR(cl.pvm, 'YYYY-MM-DD') as "date", 
            cl.status, 
            cl.planned_m3 as "plannedM3",
            cl.driver_notes as "driverNotes",
            cl.shift_type as "shiftType", 
            ct.nimike_nimi as "titleName", 
            ct.lyhenne, 
            ct.title_id as "titleId", 
            ct.req_kpl as "reqKpl", 
            ct.req_m3 as "reqM3", 
            ct.req_ton as "reqTon", 
            ct.req_h as "reqH", 
            ct.req_odotus as "reqOdotus", 
            ct.req_km as "reqKm" 
        FROM weekly_programs wp
        JOIN kalusto k ON wp.kalusto_nro = k.kalusto_nro
        LEFT JOIN kuljettajat d ON wp.kulj_id = d.kulj_id
        LEFT JOIN chip_loads cl ON wp.program_id = cl.program_id AND cl.shift_type = $3
        LEFT JOIN chip_titles ct ON cl.title_id = ct.title_id
        WHERE wp.viikko_nro = $1 AND wp.vuosi = $2
        ORDER BY k.rek_nro, cl.pvm;
    `;
        const result = await pool.query(query, [week, year, shift]);
        return result.rows;
    },

    getOrderDetails: async (orderId: number) => {
        const query = `
            SELECT co.title_id, ct.lahto_paikka_id, ct.purku_paikka_id 
            FROM chip_orders co
            JOIN chip_titles ct ON co.title_id = ct.title_id
            WHERE co.order_id = $1
        `;
        const result = await pool.query(query, [orderId]);
        return result.rows[0];
    },
    getTitleDetails: async (titleId: number) => {
        const query = `SELECT lahto_paikka_id, purku_paikka_id FROM chip_titles WHERE title_id = $1`;
        const result = await pool.query(query, [titleId]);
        return result.rows[0];
    },

    createLoadRecord: async (payload: any) => {
        const { program_id, title_id, order_id, pvm, lahto_id, purku_id, shift_type } = payload;

        const query = `
            INSERT INTO chip_loads (program_id, title_id, order_id, pvm, lahto_paikka, purku_paikka, status, planned_m3, shift_type)
            VALUES ($1, $2, $3, $4, $5, $6, 'NOT_SENT', 45, $7)
            RETURNING *;
        `;

        const values = [
            program_id,
            (title_id && title_id !== 0) ? title_id : null,
            (order_id && order_id !== 0) ? order_id : null,
            pvm,
            lahto_id,
            purku_id,
            shift_type
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    dispatchVehicleRow: async (programId: number) => {
        const query = `UPDATE public.chip_loads SET status = 'DISPATCHED' WHERE program_id = $1 AND status = 'NOT_SENT' RETURNING *;`;
        const result = await pool.query(query, [programId]);
        return result.rows;
    },

    updateVehicleDriver: async (programId: number, driverId: number) => {
        const query = `UPDATE public.weekly_programs SET kulj_id = $2 WHERE program_id = $1 RETURNING *;`;
        const result = await pool.query(query, [programId, driverId]);
        return result.rows[0];
    },

    addVehicleToWeeklyPlan: async (kalustoNro: number, week: number, year: number) => {
        const checkQuery = `SELECT program_id FROM weekly_programs WHERE kalusto_nro = $1 AND viikko_nro = $2 AND vuosi = $3`;
        const checkRes = await pool.query(checkQuery, [kalustoNro, week, year]);
        if (checkRes.rows.length > 0) return checkRes.rows[0];
        const query = `INSERT INTO weekly_programs (kalusto_nro, viikko_nro, vuosi) VALUES ($1, $2, $3) RETURNING program_id as "programId";`;
        const result = await pool.query(query, [kalustoNro, week, year]);
        return result.rows[0];
    },

    deleteLoadRecord: async (loadId: number) => {
        await pool.query(`DELETE FROM public.chip_loads WHERE load_id = $1`, [loadId]);
    },

    updateLoadRecord: async (loadId: number, data: any) => {
        const planned_m3 = data.planned_m3 || data.plannedM3;
        const driver_notes = data.driver_notes || data.driverNotes;
        const query = `UPDATE public.chip_loads SET planned_m3 = $1, driver_notes = $2 WHERE load_id = $3 RETURNING *;`;
        const result = await pool.query(query, [planned_m3, driver_notes, loadId]);
        return result.rows[0];
    },

    moveLoadRecord: async (loadId: number, newProgramId: number, newDate: string) => {
        const query = `UPDATE public.chip_loads SET program_id = $1, pvm = $2 WHERE load_id = $3 RETURNING *;`;
        const result = await pool.query(query, [newProgramId, newDate, loadId]);
        return result.rows[0];
    }

};

