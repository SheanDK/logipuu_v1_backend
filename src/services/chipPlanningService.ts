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
    },

    // 9. Get chip loads for a target ISO week (defaults are handled in controller)
    getChipLoadsByWeek: async (week: number, year: number, vehicleNumber?: number) => {
        const query = `
            SELECT
                cl.load_id,
                cl.title_id,
                cl.vehicle_number,
                cl.order_id,
                cl.scheduled_date,
                cl.serial_no,
                cl.status,
                cl.started_at,
                cl.completed_at,
                cl.actual_ton,
                cl.actual_m3,
                cl.actual_pcs,
                cl.actual_hr,
                cl.actual_km,
                cl.actual_waiting,
                cl.actual_details,
                cl.load_notes,
                cl.is_sent_from_app,
                ct.title_name,
                ct.invoicing_basis,
                ct.driver_instructions,
                ct.req_pcs,
                ct.req_m3,
                ct.req_ton,
                ct.req_hr,
                ct.req_waiting,
                ct.req_km,
                ct.req_details,
                ct.req_details_info,
                ct.loading_point_id,
                lp.nimi as loading_point_name,
                lp.sijainti_lat as loading_point_lat,
                lp.sijainti_long as loading_point_long,
                ct.unloading_point_id,
                up.purkupaikka as unloading_point_name,
                up.sijainti_lat as unloading_point_lat,
                up.sijainti_long as unloading_point_long,
                ct.product_number,
                pt.puutavara as product_name
            FROM public.chip_loads cl
            LEFT JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            LEFT JOIN public.puulaani lp ON ct.loading_point_id = lp.puulaani_id
            LEFT JOIN public.purkupaikka up ON ct.unloading_point_id = up.purkupaikka_id
            LEFT JOIN public.puutavarat pt ON ct.product_number = pt.puutavara_nro
            WHERE cl.scheduled_date >= to_date($1::text || '-' || $2::text || '-1', 'IYYY-IW-ID')
              AND cl.scheduled_date < to_date($1::text || '-' || $2::text || '-1', 'IYYY-IW-ID') + interval '7 days'
              AND ($3::smallint IS NULL OR cl.vehicle_number = $3::smallint)
            ORDER BY cl.serial_no ASC, cl.scheduled_date ASC, cl.load_id ASC;
        `;
        const result = await pool.query(query, [year, week, vehicleNumber ?? null]);
        return result.rows;
    },

    // 10. Create or update a chip load (set load)
    setChipLoad: async (payload: any) => {
        const loadId = payload.loadId ?? payload.load_id ?? null;

        if (loadId) {
            const currentRes = await pool.query(`SELECT * FROM public.chip_loads WHERE load_id = $1`, [Number(loadId)]);
            if (currentRes.rowCount === 0) {
                throw new Error('NOT_FOUND');
            }

            const current = currentRes.rows[0];

            const nextData = {
                titleId: payload.titleId ?? payload.title_id ?? current.titleId,
                vehicleNumber: payload.vehicleNumber ?? payload.vehicle_number ?? current.vehicleNumber,
                orderId: payload.orderId ?? payload.order_id ?? current.orderId ?? null,
                scheduledDate: payload.scheduledDate ?? payload.scheduled_date ?? current.scheduledDate,
                serialNo: payload.serialNo ?? payload.serial_no ?? current.serialNo ?? 0,
                status: payload.status ?? current.status ?? 'NOT_SENT',
                startedAt: payload.startedAt ?? payload.started_at ?? current.startedAt ?? null,
                completedAt: payload.completedAt ?? payload.completed_at ?? current.completedAt ?? null,
                actualTon: payload.actualTon ?? payload.actual_ton ?? current.actualTon ?? null,
                actualM3: payload.actualM3 ?? payload.actual_m3 ?? current.actualM3 ?? null,
                actualPcs: payload.actualPcs ?? payload.actual_pcs ?? current.actualPcs ?? null,
                actualHr: payload.actualHr ?? payload.actual_hr ?? current.actualHr ?? null,
                actualKm: payload.actualKm ?? payload.actual_km ?? current.actualKm ?? null,
                actualWaiting: payload.actualWaiting ?? payload.actual_waiting ?? current.actualWaiting ?? null,
                actualDetails: payload.actualDetails ?? payload.actual_details ?? current.actualDetails ?? null,
                loadNotes: payload.loadNotes ?? payload.load_notes ?? current.loadNotes ?? null,
                isSentFromApp: payload.isSentFromApp ?? payload.is_sent_from_app ?? current.isSentFromApp ?? false
            };

            const updateQuery = `
                UPDATE public.chip_loads
                SET
                    title_id = $1,
                    vehicle_number = $2,
                    order_id = $3,
                    scheduled_date = $4,
                    serial_no = $5,
                    status = $6,
                    started_at = $7,
                    completed_at = $8,
                    actual_ton = $9,
                    actual_m3 = $10,
                    actual_pcs = $11,
                    actual_hr = $12,
                    actual_km = $13,
                    actual_waiting = $14,
                    actual_details = $15,
                    load_notes = $16,
                    is_sent_from_app = $17
                WHERE load_id = $18
                RETURNING *;
            `;

            const result = await pool.query(updateQuery, [
                Number(nextData.titleId),
                Number(nextData.vehicleNumber),
                nextData.orderId !== null ? Number(nextData.orderId) : null,
                nextData.scheduledDate,
                Number(nextData.serialNo),
                String(nextData.status),
                nextData.startedAt,
                nextData.completedAt,
                nextData.actualTon !== null ? Number(nextData.actualTon) : null,
                nextData.actualM3 !== null ? Number(nextData.actualM3) : null,
                nextData.actualPcs !== null ? Number(nextData.actualPcs) : null,
                nextData.actualHr !== null ? Number(nextData.actualHr) : null,
                nextData.actualKm !== null ? Number(nextData.actualKm) : null,
                nextData.actualWaiting !== null ? Number(nextData.actualWaiting) : null,
                nextData.actualDetails,
                nextData.loadNotes,
                Boolean(nextData.isSentFromApp),
                Number(loadId)
            ]);
            return result.rows[0];
        }

        const titleId = payload.titleId ?? payload.title_id;
        const vehicleNumber = payload.vehicleNumber ?? payload.vehicle_number;
        const scheduledDate = payload.scheduledDate ?? payload.scheduled_date;
        const orderId = payload.orderId ?? payload.order_id ?? null;
        const providedSerial = payload.serialNo ?? payload.serial_no;

        let serialNo = 0;
        if (providedSerial !== undefined && providedSerial !== null) {
            serialNo = Number(providedSerial);
        } else {
            const seqRes = await pool.query(
                `SELECT COALESCE(MAX(serial_no), -1) + 1 as next_seq
                 FROM public.chip_loads
                 WHERE vehicle_number = $1 AND scheduled_date = $2`,
                [Number(vehicleNumber), scheduledDate]
            );
            serialNo = Number(seqRes.rows[0].nextSeq);
        }

        const insertQuery = `
            INSERT INTO public.chip_loads (
                title_id,
                vehicle_number,
                order_id,
                scheduled_date,
                serial_no,
                status,
                started_at,
                completed_at,
                actual_ton,
                actual_m3,
                actual_pcs,
                actual_hr,
                actual_km,
                actual_waiting,
                actual_details,
                load_notes,
                is_sent_from_app
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
            )
            RETURNING *;
        `;

        const result = await pool.query(insertQuery, [
            Number(titleId),
            Number(vehicleNumber),
            orderId !== null ? Number(orderId) : null,
            scheduledDate,
            serialNo,
            String(payload.status ?? 'NOT_SENT'),
            payload.startedAt ?? payload.started_at ?? null,
            payload.completedAt ?? payload.completed_at ?? null,
            payload.actualTon ?? payload.actual_ton ?? null,
            payload.actualM3 ?? payload.actual_m3 ?? null,
            payload.actualPcs ?? payload.actual_pcs ?? null,
            payload.actualHr ?? payload.actual_hr ?? null,
            payload.actualKm ?? payload.actual_km ?? null,
            payload.actualWaiting ?? payload.actual_waiting ?? null,
            payload.actualDetails ?? payload.actual_details ?? null,
            payload.loadNotes ?? payload.load_notes ?? null,
            payload.isSentFromApp ?? payload.is_sent_from_app ?? false
        ]);
        return result.rows[0];
    }
};
