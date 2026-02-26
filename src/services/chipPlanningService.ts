// backend/src/services/chipPlanningService.ts
import pool from '../config/db';

export const chipPlanningService = {
    // 1. Get Weekly Planning Data
    getWeeklyPlanningData: async (week: number, year: number) => {
        const query = `
            SELECT 
                k.kalusto_nro as "kalustoNro", 
                k.rek_nro as "rekNro", 
                cl.load_id as "loadId", 
                cl.order_id as "orderId",
                TO_CHAR(cl.scheduled_date, 'YYYY-MM-DD') as "date", 
                cl.status, 
                cl.serial_no as "serialNo",
                cl.actual_m3 as "actualM3",
                cl.actual_ton as "actualTon",
                cl.actual_details as "driverNotes",
                COALESCE(ct.title_name, '') as "titleName", 
                COALESCE(ct.abbreviation, '') as "abbreviation"
            FROM public.kalusto k
            LEFT JOIN public.chip_loads cl ON k.kalusto_nro = cl.vehicle_number 
                AND EXTRACT(WEEK FROM cl.scheduled_date) = $1 
                AND EXTRACT(YEAR FROM cl.scheduled_date) = $2
            LEFT JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            WHERE k.aktiivinen = true
            ORDER BY k.rek_nro, cl.scheduled_date, cl.serial_no;
        `;
        const result = await pool.query(query, [week, year]);
        return result.rows;
    },

    // 2. Create Load Record
    createLoadRecord: async (payload: any) => {
        const { vehicle_number, title_id, order_id, scheduled_date } = payload;

        const seqRes = await pool.query(
            `SELECT COALESCE(MAX(serial_no), -1) + 1 as next_seq 
             FROM public.chip_loads 
             WHERE vehicle_number = $1 AND scheduled_date = $2`,
            [vehicle_number, scheduled_date]
        );
        const nextSerial = seqRes.rows[0].next_seq;

        const query = `
            INSERT INTO public.chip_loads (vehicle_number, title_id, order_id, scheduled_date, serial_no, status)
            VALUES ($1, $2, $3, $4, $5, 'NOT_SENT')
            RETURNING *;
        `;
        const result = await pool.query(query, [vehicle_number, title_id, order_id || null, scheduled_date, nextSerial]);
        return result.rows[0];
    },

    // 3. Update Load Record
    updateLoadRecord: async (loadId: number, data: any) => {
        const query = `
            UPDATE public.chip_loads 
            SET actual_details = $1 
            WHERE load_id = $2 
            RETURNING *;
        `;
        const result = await pool.query(query, [data.driverNotes || '', loadId]);
        return result.rows[0];
    },

    // 4. Delete Load Record
    deleteLoadRecord: async (loadId: number) => {
        const query = `DELETE FROM public.chip_loads WHERE load_id = $1;`;
        await pool.query(query, [loadId]);
    },

    // 5. Move Load Record
    moveLoadRecord: async (loadId: number, newVehicleNumber: number, newDate: string) => {
        const seqRes = await pool.query(
            `SELECT COALESCE(MAX(serial_no), -1) + 1 as next_seq 
             FROM public.chip_loads 
             WHERE vehicle_number = $1 AND scheduled_date = $2`,
            [newVehicleNumber, newDate]
        );
        const nextSerial = seqRes.rows[0].next_seq;

        const query = `
            UPDATE public.chip_loads 
            SET vehicle_number = $1, scheduled_date = $2, serial_no = $3 
            WHERE load_id = $4 
            RETURNING *;
        `;
        const result = await pool.query(query, [newVehicleNumber, newDate, nextSerial, loadId]);
        return result.rows[0];
    },

    // 6. Add Vehicle to Plan
    addVehicleToWeeklyPlan: async (kalustoNro: number, week: number, year: number) => {
        return { success: true, kalustoNro, week, year };
    },

    // 7. Get Map Markers
    getChipMapMarkers: async () => {
        const query = `
            SELECT 
                ct.title_id as id, 
                ct.title_name as name, 
                ct.abbreviation,
                p_origin.sijainti_lat as "originLat", 
                p_origin.sijainti_long as "originLong", 
                p_origin.nimi as "originName",
                p_dest.sijainti_lat as "destLat", 
                p_dest.sijainti_long as "destLong", 
                p_dest.purkupaikka as "destName",
                a.kohteen_vari as color
            FROM public.chip_titles ct
            JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            JOIN public.puulaani p_origin ON ct.loading_point_id = p_origin.puulaani_id
            JOIN public.purkupaikka p_dest ON ct.unloading_point_id = p_dest.purkupaikka_id
            WHERE ct.is_active = true;
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    // 8. Dispatch Vehicle Row
    dispatchVehicleRow: async (kalustoNro: number, week: number, year: number) => {
        const query = `
            UPDATE public.chip_loads 
            SET status = 'DISPATCHED' 
            WHERE vehicle_number = $1 
            AND EXTRACT(WEEK FROM scheduled_date) = $2 
            AND EXTRACT(YEAR FROM scheduled_date) = $3 
            AND status = 'NOT_SENT'
            RETURNING *;
        `;
        const result = await pool.query(query, [kalustoNro, week, year]);
        return result.rows;
    }
};