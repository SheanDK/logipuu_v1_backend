// backend/src/services/chipInvoicingService.ts
import pool from '../config/db';

export const chipInvoicingService = {
    search: async (f: any) => {
        const params: any[] = [];
        const where: string[] = [];
        let idx = 1;
        //1.dates
        if (f.dateFrom) { where.push(`cl.scheduled_date >= $${idx++}`); params.push(f.dateFrom); }
        if (f.dateTo) { where.push(`cl.scheduled_date <= $${idx++}`); params.push(f.dateTo); }

        //2.Billed/Unbilled Logic
        const showUnbilled = String(f.unbilled) === 'true';
        const showBilled = String(f.billed) === 'true';

        if (showUnbilled && showBilled) {
            //Billed + Unbilled
        } else if (showUnbilled) {
            //Unbilled only
            where.push(`COALESCE(cl.is_billed, false) = false`);
        } else if (showBilled) {
            //Billed only
            where.push(`cl.is_billed = true`);
        } else {
            //nothing selected
            return [];
        }

        // 3. Status පරීක්ෂාව
        where.push(`cl.status IN ('SENT', 'COMPLETED')`);

        const query = `
            SELECT 
                cl.load_id AS "loadId",
                cl.scheduled_date AS "date",
                cl.actual_m3 AS "actualM3",
                cl.unit_price_m3 AS "unitPriceM3",
                cl.actual_ton AS "actualTon",
                cl.unit_price_ton AS "unitPriceTon",
                cl.actual_hr AS "actualHr",
                cl.unit_price_hr AS "unitPriceHr",
                cl.total_amount AS "total",
                COALESCE(cl.is_billed, false) AS "billed",
                ct.title_name AS "titleName",
                a.asiakkaan_nimi AS "customer",
                k.rek_nro AS "vehicle",
                ku.nimi AS "driverName"
            FROM public.chip_loads cl
            LEFT JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            LEFT JOIN public.kalusto k ON cl.vehicle_number = k.kalusto_nro
            LEFT JOIN public.kuljettajat ku ON cl.driver_user_id = ku.kulj_id
            WHERE ${where.length ? where.join(' AND ') : '1=1'}
            ORDER BY cl.scheduled_date DESC
        `;

        const res = await pool.query(query, params);
        return res.rows;
    },

    updateLoad: async (id: number, data: any) => {
        const query = `
            UPDATE public.chip_loads 
            SET 
                actual_m3 = $1, unit_price_m3 = $2,
                actual_ton = $3, unit_price_ton = $4,
                actual_pcs = $5, unit_price_pcs = $6,
                actual_hr = $7, unit_price_hr = $8,
                actual_km = $9, unit_price_km = $10,
                total_amount = $11
            WHERE load_id = $12 
            RETURNING *
        `;
        //send Number() NaN errors 
        const params = [
            Number(data.actualM3) || 0, Number(data.priceM3) || 0,
            Number(data.actualTon) || 0, Number(data.priceTon) || 0,
            Number(data.actualPcs) || 0, Number(data.pricePcs) || 0,
            Number(data.actualHr) || 0, Number(data.priceHr) || 0,
            Number(data.actualKm) || 0, Number(data.priceKm) || 0,
            Number(data.total) || 0,
            id
        ];
        const res = await pool.query(query, params);
        return res.rows[0];
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

};