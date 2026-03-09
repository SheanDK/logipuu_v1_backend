// backend/src/services/chipInvoicingService.ts

import pool from '../config/db';

export const chipInvoicingService = {
    // Search for Invoicing
    search: async (filters: any) => {
        const { dateFrom, dateTo, customerId, vehicleId, billed } = filters;
        let query = `
            SELECT cl.*, ct.title_name, ct.abbreviation, a.asiakkaan_nimi as "customerName",
                   k.rek_nro as "vehicleRegNo"
            FROM public.chip_loads cl
            JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            JOIN public.kalusto k ON cl.vehicle_number = k.kalusto_nro
            WHERE cl.scheduled_date BETWEEN $1 AND $2
        `;

        const params = [dateFrom, dateTo];
        if (customerId) { query += ` AND ct.customer_id = $${params.length + 1}`; params.push(customerId); }
        if (vehicleId) { query += ` AND cl.vehicle_number = $${params.length + 1}`; params.push(vehicleId); }
        if (billed !== undefined) { query += ` AND cl.is_billed = $${params.length + 1}`; params.push(billed); }

        query += ` ORDER BY cl.scheduled_date DESC`;
        const res = await pool.query(query, params);
        return res.rows;
    },

    // Mark selected Loads as Billed
    markAsBilled: async (loadIds: number[]) => {
        const query = `
            UPDATE public.chip_loads 
            SET is_billed = true, billed_date = CURRENT_DATE 
            WHERE load_id = ANY($1)
            RETURNING load_id
        `;
        const res = await pool.query(query, [loadIds]);
        return res.rows;
    }
};