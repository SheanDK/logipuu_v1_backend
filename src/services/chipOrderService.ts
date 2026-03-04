// backend/src/services/chipOrderService.ts
import pool from '../config/db';
import { chipQueries } from '../queries/chipQueries/chipQueries';

// --- CHIP ORDER SERVICE ---
export const chipOrderService = {
    getActive: async () => {
        const res = await pool.query(chipQueries.getActiveOrders);
        return res.rows;
    },
    create: async (data: any) => {
        const query = `INSERT INTO public.chip_orders (title_id, start_date, end_date, target_qty, notes, weekly_dist) 
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [data.title_id, data.start_date, data.end_date, data.target_qty, data.notes, JSON.stringify(data.weekly_dist)];
        const res = await pool.query(query, values);
        return res.rows[0];
    }
};