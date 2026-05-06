// backend/src/services/chipInvoicingService.ts
import pool from '../config/db';

export interface ChipSearchFilters {
    dateFrom: string;
    dateTo: string;
    customerId?: number | null;
    vehicleId?: number | null;
    unbilled: boolean;
    billed: boolean;
}

export const chipInvoicingService = {
    // 1. Search with sophisticated JOINS
    search: async (f: ChipSearchFilters) => {
        const params: any[] = [];
        const where: string[] = [];
        let idx = 1;

        if (f.dateFrom) { where.push(`cl.scheduled_date >= $${idx++}`); params.push(f.dateFrom); }
        if (f.dateTo) { where.push(`cl.scheduled_date <= $${idx++}`); params.push(f.dateTo); }
        if (f.customerId) { where.push(`ct.customer_id = $${idx++}`); params.push(f.customerId); }
        if (f.vehicleId) { where.push(`cl.vehicle_number = $${idx++}`); params.push(f.vehicleId); }

        if (f.unbilled && !f.billed) {
            where.push(`COALESCE(cl.is_billed, false) = false`);
        } else if (!f.unbilled && f.billed) {
            where.push(`cl.is_billed = true`);
        }

        const query = `
            SELECT 
                cl.load_id AS "loadId",
                cl.scheduled_date AS "date",
                cl.actual_m3 AS "actualM3",
                cl.actual_ton AS "actualTon",
                cl.actual_pcs AS "actualPcs",
                cl.actual_hr AS "actualHr",
                cl.actual_km AS "actualKm",
                cl.actual_waiting AS "actualWaiting",
                COALESCE(cl.is_billed, false) AS "billed",
                cl.billed_date AS "billedDate",
                ct.title_name AS "titleName",
                a.asiakkaan_nimi AS "customer",
                k.rek_nro AS "vehicle",
                k.kalusto_nro AS "vehicleNumber",
                cl.status
            FROM public.chip_loads cl
            JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            JOIN public.kalusto k ON cl.vehicle_number = k.kalusto_nro
            WHERE cl.status = 'COMPLETED'
            ${where.length ? 'AND ' + where.join(' AND ') : ''}
            ORDER BY cl.scheduled_date DESC, a.asiakkaan_nimi ASC
        `;

        const res = await pool.query(query, params);
        return res.rows;
    },

    // 2. Mark selected loads as Invoiced
    invoiceLoads: async (loadIds: number[]) => {
        const query = `
            UPDATE public.chip_loads 
            SET is_billed = true, billed_date = CURRENT_DATE 
            WHERE load_id = ANY($1) AND COALESCE(is_billed, false) = false
            RETURNING load_id
        `;
        const res = await pool.query(query, [loadIds]);
        return {
            updatedCount: res.rowCount,
            updatedIds: res.rows.map(r => r.load_id),
            billedDate: new Date().toISOString().split('T')[0]
        };
    },

    // 3. Update Load Metrics (from Edit Dialog)
    updateLoad: async (id: number, data: any) => {
        const query = `
            UPDATE public.chip_loads 
            SET actual_m3 = $1, actual_ton = $2, actual_pcs = $3, actual_hr = $4, actual_km = $5
            WHERE load_id = $6 RETURNING *
        `;
        const res = await pool.query(query, [data.actualM3, data.actualTon, data.actualPcs, data.actualHr, data.actualKm, id]);
        return res.rows[0];
    }
};