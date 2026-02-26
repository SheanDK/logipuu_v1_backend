// backend/src/controllers/chipTitleController.ts
import { Request, Response } from 'express';
import pool from '../config/db';

// 1. create chip title
export const createChipTitle = async (req: Request, res: Response) => {
    console.log("📥 [BACKEND] Received Create Request. Body:", req.body);
    try {
        const {
            title_number,
            customer_id,
            loading_point_id,
            unloading_point_id,
            product_number,
            title_name,
            abbreviation,
            invoicing_basis,
            driver_instructions,
            req_pcs,
            req_m3,
            req_ton,
            req_hr,
            req_waiting,
            req_km,
            req_details,
            req_details_info,
            is_active
        } = req.body;

        const query = `
            INSERT INTO public.chip_titles (
                title_number, 
                customer_id, 
                loading_point_id, 
                unloading_point_id,
                product_number, 
                title_name, 
                abbreviation, 
                invoicing_basis,
                driver_instructions, 
                req_pcs, 
                req_m3, 
                req_ton, 
                req_hr,
                req_waiting, 
                req_km, 
                req_details, 
                req_details_info,
                is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
            RETURNING *;
        `;

        const values = [
            title_number,
            customer_id,
            loading_point_id,
            unloading_point_id,
            product_number,
            title_name,
            abbreviation,
            invoicing_basis,
            driver_instructions,
            !!req_pcs,
            !!req_m3,
            !!req_ton,
            !!req_hr,
            !!req_waiting,
            !!req_km,
            !!req_details,
            req_details_info,
            !!is_active
        ];

        console.log("🔍 [BACKEND] Executing Query:", query);
        const result = await pool.query(query, values);
        console.log("✅ [BACKEND] Insert Success! Result:", result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error: any) {
        console.error("❌ [BACKEND] Insert Error:", error);
        res.status(500).json({ error: 'Database Error', details: error.message });
    }
};

export const getAllChipTitles = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT 
                ct.title_id,
                ct.title_name,
                ct.abbreviation,
                ct.invoicing_basis,
                ct.is_active,
                ct.req_pcs,
                ct.req_m3,
                ct.req_ton,
                ct.req_hr,
                ct.req_waiting,
                ct.req_km,
                ct.customer_id,
                ct.loading_point_id,
                ct.unloading_point_id,
                ct.product_number,
                ct.title_number,
                ct.driver_instructions,
                a.asiakkaan_nimi as customer_name,
                p.nimi as loading_point_name,
                pp.purkupaikka as unloading_point_name,
                pt.puutavara as product_name
            FROM public.chip_titles ct
            LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            LEFT JOIN public.puulaani p ON ct.loading_point_id = p.puulaani_id
            LEFT JOIN public.purkupaikka pp ON ct.unloading_point_id = pp.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON ct.product_number = pt.puutavara_nro
            ORDER BY ct.title_id DESC;
        `;
        const result = await pool.query(query);

        // Debugging: Backend එකට දත්ත ලැබෙනවාදැයි පරීක්ෂා කිරීමට
        console.log(`✅ [BACKEND] Fetched ${result.rows.length} titles`);

        res.status(200).json(result.rows);
    } catch (error: any) {
        console.error('❌ [SERVER ERROR]:', error.message);
        res.status(500).json({ error: error.message });
    }
};



export const updateChipTitle = async (req: Request, res: Response) => {
    console.log("📥 [BACKEND] Received Update Request. Body:", req.body);
    try {
        const { id } = req.params;
        const {
            title_number,
            customer_id,
            loading_point_id,
            unloading_point_id,
            product_number,
            title_name,
            abbreviation,
            invoicing_basis,
            driver_instructions,
            req_pcs,
            req_m3,
            req_ton,
            req_hr,
            req_waiting,
            req_km,
            req_details,
            req_details_info,
            is_active
        } = req.body;

        const query = `
            UPDATE public.chip_titles 
            SET 
                title_number = $1, 
                customer_id = $2, 
                loading_point_id = $3, 
                unloading_point_id = $4, 
                product_number = $5, 
                title_name = $6,
                abbreviation = $7, 
                invoicing_basis = $8, 
                driver_instructions = $9,
                req_pcs = $10, 
                req_m3 = $11, 
                req_ton = $12, 
                req_hr = $13,
                req_waiting = $14, 
                req_km = $15, 
                req_details = $16,
                req_details_info = $17, 
                is_active = $18
            WHERE title_id = $19
            RETURNING *;
        `;

        const values = [
            title_number,
            customer_id,
            loading_point_id,
            unloading_point_id,
            product_number,
            title_name,
            abbreviation,
            invoicing_basis,
            driver_instructions,
            !!req_pcs,
            !!req_m3,
            !!req_ton,
            !!req_hr,
            !!req_waiting,
            !!req_km,
            !!req_details,
            req_details_info,
            is_active !== false,
            Number(id)
        ];

        console.log("🔍 [BACKEND] Executing Query:", query);
        console.log("🔍 [BACKEND] With Values:", values);
        const result = await pool.query(query, values);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Title not found' });
        console.log("✅ [BACKEND] Update Success! Result:", result.rows[0]);
        res.status(200).json(result.rows[0]);
    } catch (error: any) {
        console.error("❌ [BACKEND] Update Error:", error);
        res.status(500).json({ error: 'Database Error', details: error.message });
    }
};


