//backend/src/controllers/chipOrderController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// 1. Create Chip Order (Subscription)
export const createChipOrder = async (req: Request, res: Response) => {
    console.log("📥 [BACKEND] Received Payload:", req.body); // ලැබෙන දත්ත Terminal එකේ බලන්න

    try {
        const { title_id, start_date, target_qty, weekly_dist } = req.body;

        // Validation පරීක්ෂා කිරීම
        if (!title_id || isNaN(Number(title_id))) {
            return res.status(400).json({ error: "පද්ධතියට Title ID එක ලැබී නැත. කරුණාකර නැවත තෝරන්න." });
        }
        if (!start_date) {
            return res.status(400).json({ error: "ආරම්භක දිනය (Start Date) අනිවාර්ය වේ." });
        }

        const query = `
            INSERT INTO public.chip_orders (title_id, start_date, end_date, target_qty, notes, weekly_dist)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
        `;

        const values = [
            title_id,
            start_date,
            req.body.end_date || null,
            target_qty || 0,
            req.body.notes || '',
            JSON.stringify(weekly_dist || {})
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);

    } catch (error: any) {
        console.error("❌ BACKEND ERROR:", error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

export const getActiveChipOrders = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT 
                co.order_id as "orderId", 
                co.title_id as "titleId",
                a.asiakkaan_nimi as "customerName", 
                ct.abbreviation, 
                pt.puutavara as "productType",
                TO_CHAR(co.start_date, 'DD.MM.YYYY') as "startDate",
                TO_CHAR(co.end_date, 'DD.MM.YYYY') as "endDate",
                co.target_qty as "targetQty", 
                co.weekly_dist as "weeklyDistribution",
                (SELECT COUNT(*) FROM public.chip_loads cl WHERE cl.order_id = co.order_id) as "scheduledCount"
            FROM public.chip_orders co
            LEFT JOIN public.chip_titles ct ON co.title_id = ct.title_id
            LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            LEFT JOIN public.puutavarat pt ON ct.product_number = pt.puutavara_nro
            WHERE co.is_active = true
            ORDER BY co.order_id DESC;
        `;

        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error("DATABASE ERROR in getActiveChipOrders:", error.message);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};


// 3. Get Weekly Plan 
export const getWeeklyPlan = async (req: Request, res: Response) => {
    try {
        const { week, year } = req.query;
        const query = `
            SELECT 
                wp.kalusto_nro, k.kalusto_nro, k.rek_nro AS vehicle_reg_no,
                d.nimi AS driver_name, cl.load_id, cl.pvm AS scheduled_date, cl.status,
                cl.actual_m3, ct.title_name AS title_name, ct.abbreviation
            FROM weekly_programs wp 
            JOIN kalusto k ON wp.kalusto_nro = k.kalusto_nro
            LEFT JOIN kuljettajat d ON wp.kulj_id = d.kulj_id
            LEFT JOIN chip_loads cl ON wp.kalusto_nro = cl.kalusto_nro
            LEFT JOIN chip_titles ct ON cl.title_id = ct.title_id
            WHERE wp.viikko_nro = $1 AND wp.vuosi = $2
            ORDER BY wp.kalusto_nro, cl.pvm;
        `;
        const result = await pool.query(query, [week, year]);
        res.status(200).json(result.rows);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. Schedule a New Load 
export const scheduleChipLoad = async (req: Request, res: Response) => {
    try {
        const { kalusto_nro, title_id, order_id, pvm } = req.body;
        const query = `
            INSERT INTO public.chip_loads (kalusto_nro, title_id, order_id, pvm, status)
            VALUES ($1, $2, $3, $4, 'NOT_SENT') RETURNING *;
        `;
        const result = await pool.query(query, [kalusto_nro, title_id, order_id || null, pvm]);
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 5. Update Order
export const updateChipOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const {
            title_id,
            start_date,
            end_date,
            target_qty,
            notes,
            weekly_dist,
            is_active
        } = req.body;

        const query = `
            UPDATE public.chip_orders 
            SET 
            title_id = $1, 
            start_date = $2, 
            end_date = $3, 
            target_qty = $4, 
            notes = $5, 
            weekly_dist = $6,
            is_active = $7
            WHERE order_id = $8
            RETURNING *;
        `;

        const values = [
            title_id,
            start_date,
            end_date || start_date,
            target_qty,
            notes,
            JSON.stringify(weekly_dist),
            is_active,
            orderId
        ];

        const result = await pool.query(query, values);
        res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error('DATABASE ERROR in updateChipOrder:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// 6. Delete Order
export const deleteChipOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        await pool.query(`DELETE FROM public.chip_loads WHERE order_id = $1`, [orderId]);
        await pool.query(`DELETE FROM public.chip_orders WHERE order_id = $1`, [orderId]);
        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("DATABASE ERROR in deleteChipOrder:", error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
};