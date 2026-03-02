// backend/src/services/chipTitleService.ts
import pool from '../config/db';
import { chipQueries } from '../queries/chipQueries/chipQueries';

export const chipTitleService = {
    getAll: async () => {
        const res = await pool.query(chipQueries.getAllTitles);
        return res.rows;
    },
    create: async (data: any) => {
        const query = `INSERT INTO public.chip_titles (title_number, customer_id, loading_point_id, unloading_point_id, product_number, title_name, abbreviation, invoicing_basis, driver_instructions, req_pcs, req_m3, req_ton, req_hr, req_waiting, req_km, req_details, req_details_info, is_active) 
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`;
        const values = [data.title_number, data.customer_id, data.loading_point_id, data.unloading_point_id, data.product_number, data.title_name, data.abbreviation, data.invoicing_basis, data.driver_instructions, !!data.req_pcs, !!data.req_m3, !!data.req_ton, !!data.req_hr, !!data.req_waiting, !!data.req_km, !!data.req_details, data.req_details_info, data.is_active !== false];
        const res = await pool.query(query, values);
        return res.rows[0];
    }
};