//backend/src/controllers/chipInvoicingController.ts

import { Request, Response } from 'express';
import pool from '../config/db';

export const searchChipInvoicing = async (req: Request, res: Response) => {
    try {
        const { dateFrom, dateTo, billed } = req.query;
        const isBilled = billed === 'true';

        const query = `
            SELECT cl.*, ct.title_name, ct.abbreviation, a.asiakkaan_nimi as "customerName",
                   k.rek_nro as "vehicleRegNo"
            FROM public.chip_loads cl
            JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            JOIN public.kalusto k ON cl.vehicle_number = k.kalusto_nro
            WHERE cl.scheduled_date BETWEEN $1 AND $2
            AND cl.is_billed = $3
            AND cl.status = 'COMPLETED'
            ORDER BY cl.scheduled_date DESC
        `;

        const result = await pool.query(query, [dateFrom, dateTo, isBilled]);
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error("Search Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const markAsBilled = async (req: Request, res: Response) => {
    try {
        const { loadIds } = req.body;
        const query = `
            UPDATE public.chip_loads 
            SET is_billed = true, billed_date = CURRENT_DATE 
            WHERE load_id = ANY($1)
            RETURNING load_id
        `;
        const result = await pool.query(query, [loadIds]);
        res.status(200).json({ success: true, updatedCount: result.rowCount });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};