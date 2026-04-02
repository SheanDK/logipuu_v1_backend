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
        cl.actual_pcs as "actualPcs",
        cl.actual_hr as "actualHr",
        cl.actual_km as "actualKm",
        cl.actual_waiting as "actualWaiting",
        cl.actual_details as "actualDetails",
        ct.title_name as "titleName", 
        ct.abbreviation as "abbreviation",
        ct.req_pcs as "req_pcs",
        ct.req_m3 as "req_m3",
        ct.req_ton as "req_ton",
        ct.req_hr as "req_hr",
        ct.req_waiting as "req_waiting",
        ct.req_km as "req_km",
        ct.req_details as "req_details",
        ct.req_details_info as "req_details_info",
        cl.transfer_status as "transferStatus",
        cl.requested_user_id as "requestedUserId"
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


    // 2. Assign weekly loads to driver
    getDriverLoads: async (vehicleId: number, week: number, year: number) => {
        const query = `
        SELECT cl.*, 
               ct.title_name, ct.driver_instructions, ct.invoicing_basis,
               ct.req_pcs, ct.req_m3, ct.req_ton, ct.req_hr, ct.req_waiting, ct.req_km, ct.req_details, ct.req_details_info,
               p_load.nimi as loading_point_name, p_load.sijainti_lat as loading_point_lat, p_load.sijainti_long as loading_point_lng,
               p_unload.purkupaikka as unloading_point_name, p_unload.sijainti_lat as unloading_point_lat, p_unload.sijainti_long as unloading_point_lng,
               pt.puutavara as product_name
        FROM public.chip_loads cl
        JOIN public.chip_titles ct ON cl.title_id = ct.title_id
        LEFT JOIN public.puulaani p_load ON ct.loading_point_id = p_load.puulaani_id
        LEFT JOIN public.purkupaikka p_unload ON ct.unloading_point_id = p_unload.purkupaikka_id
        LEFT JOIN public.puutavarat pt ON ct.product_number = pt.puutavara_nro
        WHERE cl.vehicle_number = $1 
        AND EXTRACT(WEEK FROM cl.scheduled_date) = $2
        AND EXTRACT(YEAR FROM cl.scheduled_date) = $3
        AND cl.status IN ('DISPATCHED', 'LOADED', 'UNLOADED', 'SENT')
        ORDER BY cl.serial_no ASC;
    `;
        const res = await pool.query(query, [vehicleId, week, year]);
        return res.rows;
    },

    // 3. Update load metrics
    updateLoadMetrics: async (loadId: number, data: any) => {
        const getSafeNum = (val: any) => (val === null || val === undefined || isNaN(Number(val)) || val === '') ? null : Number(val);
        const getSafeStr = (val: any) => (val === null || val === undefined) ? null : String(val);

        const updates: string[] = [];
        const values: any[] = [];
        let index = 1;

        if (data.started_at !== undefined) { updates.push(`started_at = $${index++}`); values.push(data.started_at || null); }
        if (data.completed_at !== undefined) { updates.push(`completed_at = $${index++}`); values.push(data.completed_at || null); }
        if (data.actual_ton !== undefined) { updates.push(`actual_ton = $${index++}`); values.push(getSafeNum(data.actual_ton)); }
        if (data.actual_m3 !== undefined) { updates.push(`actual_m3 = $${index++}`); values.push(getSafeNum(data.actual_m3)); }
        if (data.actual_pcs !== undefined) { updates.push(`actual_pcs = $${index++}`); values.push(getSafeNum(data.actual_pcs)); }
        if (data.actual_hr !== undefined) { updates.push(`actual_hr = $${index++}`); values.push(getSafeNum(data.actual_hr)); }
        if (data.actual_km !== undefined) { updates.push(`actual_km = $${index++}`); values.push(getSafeNum(data.actual_km)); }
        if (data.actual_waiting !== undefined) { updates.push(`actual_waiting = $${index++}`); values.push(getSafeNum(data.actual_waiting)); }
        if (data.actual_details !== undefined) { updates.push(`actual_details = $${index++}`); values.push(getSafeStr(data.actual_details)); }
        if (data.status !== undefined) { updates.push(`status = $${index++}`); values.push(data.status || null); }
        if (data.is_sent_from_app !== undefined) { updates.push(`is_sent_from_app = $${index++}`); values.push(data.is_sent_from_app ?? null); }

        if (updates.length === 0) {
            const res = await pool.query(`SELECT * FROM public.chip_loads WHERE load_id = $1`, [loadId]);
            return res.rows[0];
        }

        values.push(loadId);
        const query = `UPDATE public.chip_loads SET ${updates.join(', ')} WHERE load_id = $${index} RETURNING *`;
        const res = await pool.query(query, values);
        return res.rows[0];
    },

    // 4. Create Load Record
    createLoadRecord: async (payload: any) => {
        const { vehicle_number, title_id, order_id, scheduled_date, loading_point_id, unloading_point_id, planned_m3 } = payload;

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
        const result = await pool.query(query, [
            vehicle_number,
            title_id,
            order_id || null,
            scheduled_date,
            nextSerial
        ]);
        return result.rows[0];
    },

    // 5. Update Load Record
    updateLoadRecord: async (loadId: number, data: any) => {
        // dynamic query 
        const query = `
        UPDATE public.chip_loads 
        SET 
            vehicle_number = COALESCE($1, vehicle_number),
            actual_details = COALESCE($2, actual_details),
            status = COALESCE($3, status)
        WHERE load_id = $4 
        RETURNING *;
    `;

        const values = [
            data.vehicle_number ?? null,
            data.actual_details ?? data.driverNotes ?? null,
            data.status ?? null,
            loadId
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    // 6. Delete Load Record
    deleteLoadRecord: async (loadId: number) => {
        const query = `DELETE FROM public.chip_loads WHERE load_id = $1;`;
        await pool.query(query, [loadId]);
    },

    // 7. Move Load Record
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

    // 8. Add Vehicle to Plan
    addVehicleToWeeklyPlan: async (kalustoNro: number, week: number, year: number) => {
        return { success: true, kalustoNro, week, year };
    },

    // 9. Get Map Markers
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

    // 10. Dispatch Vehicle Row
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

    // Rename Group (Update all vehicles in that group)
    renameGroup: async (oldName: string, newName: string) => {
        await pool.query(`UPDATE public.kalusto SET planning_group = $1 WHERE planning_group = $2`, [newName, oldName]);
    },

    // Delete Group (Reset those vehicles to 'General')
    deleteGroup: async (groupName: string) => {
        await pool.query(`UPDATE public.kalusto SET planning_group = 'General' WHERE planning_group = $1`, [groupName]);
    },

    // Add vehicle to group
    updateVehicleGroup: async (kalustoNro: number, groupName: string) => {
        await pool.query(`UPDATE public.kalusto SET planning_group = $1 WHERE kalusto_nro = $2`, [groupName, kalustoNro]);
    },
    // 11. Get chip loads for a target ISO week (defaults are handled in controller)
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

    // 12. Create or update a chip load - FULL CORRECTED IMPLEMENTATION
    // 12. Create or update a chip load - FULL COMPLETED PRO LOGIC
    setChipLoad: async (payload: any) => {
        const loadId = payload.loadId ?? payload.load_id ?? null;

        // Helper function: NaN හෝ undefined අගයන් null බවට පත් කරයි (500 Error වැළැක්වීමට)
        const getSafeNum = (val: any) => (val === null || val === undefined || isNaN(Number(val)) || val === '') ? null : Number(val);
        const getSafeStr = (val: any) => (val === null || val === undefined) ? null : String(val);
        const getSafeBool = (val: any) => (val === 'true' || val === true);

        // රියදුරු ID එක ලබා ගැනීම
        const driverUserId = getSafeNum(payload.driver_user_id || payload.driverUserId);

        if (loadId) {
            // ==========================================
            // 🔄 UPDATE LOGIC (Status/Metrics Update)
            // ==========================================
            const currentRes = await pool.query(`SELECT * FROM public.chip_loads WHERE load_id = $1`, [Number(loadId)]);

            if (currentRes.rowCount === 0) throw new Error('NOT_FOUND');
            const current = currentRes.rows[0];

            // Helper to respect explicit nulls but fallback on undefined
            const getField = (key1: any, key2: any, current: any) => {
                if (key1 !== undefined) return key1;
                if (key2 !== undefined) return key2;
                return current;
            };

            // 🚀 CRITICAL FIX: Database එකෙන් එන snake_case fields නිවැරදිව කියවීම
            const dataToUpdate = {
                title_id: getSafeNum(getField(payload.titleId, payload.title_id, current.titleId ?? current.title_id)),
                vehicle_number: getSafeNum(getField(payload.vehicleNumber, payload.vehicle_number, current.vehicleNumber ?? current.vehicle_number)),
                order_id: getSafeNum(getField(payload.orderId, payload.order_id, current.orderId ?? current.order_id)),
                scheduled_date: getField(payload.scheduledDate, payload.scheduled_date, current.scheduledDate ?? current.scheduled_date),
                serial_no: getSafeNum(getField(payload.serialNo, payload.serial_no, current.serialNo ?? current.serial_no)),
                status: getField(payload.status, undefined, current.status),
                started_at: getField(payload.startedAt, payload.started_at, current.startedAt ?? current.started_at),
                completed_at: getField(payload.completedAt, payload.completed_at, current.completedAt ?? current.completed_at),
                actual_ton: getSafeNum(getField(payload.actualTon, payload.actual_ton, current.actualTon ?? current.actual_ton)),
                actual_m3: getSafeNum(getField(payload.actualM3, payload.actual_m3, current.actualM3 ?? current.actual_m3)),
                actual_pcs: getSafeNum(getField(payload.actualPcs, payload.actual_pcs, current.actualPcs ?? current.actual_pcs)),
                actual_hr: getSafeNum(getField(payload.actualHr, payload.actual_hr, current.actualHr ?? current.actual_hr)),
                actual_km: getSafeNum(getField(payload.actualKm, payload.actual_km, current.actualKm ?? current.actual_km)),
                actual_waiting: getSafeNum(getField(payload.actualWaiting, payload.actual_waiting, current.actualWaiting ?? current.actual_waiting)),
                actual_details: getSafeStr(getField(payload.actualDetails, payload.actual_details, current.actualDetails ?? current.actual_details)),
                load_notes: getSafeStr(getField(payload.loadNotes, payload.load_notes, current.loadNotes ?? current.load_notes)),
                is_sent_from_app: getSafeBool(getField(payload.isSentFromApp, payload.is_sent_from_app, current.isSentFromApp ?? current.is_sent_from_app)),
                driver_user_id: driverUserId !== null ? driverUserId : (current.driverUserId ?? current.driver_user_id)
            };

            const updateQuery = `
                UPDATE public.chip_loads
                SET title_id = $1, vehicle_number = $2, order_id = $3, scheduled_date = $4,
                    serial_no = $5, status = $6, started_at = $7, completed_at = $8,
                    actual_ton = $9, actual_m3 = $10, actual_pcs = $11, actual_hr = $12,
                    actual_km = $13, actual_waiting = $14, actual_details = $15,
                    load_notes = $16, is_sent_from_app = $17, driver_user_id = $18
                WHERE load_id = $19 RETURNING *;
            `;

            const result = await pool.query(updateQuery, [
                dataToUpdate.title_id, dataToUpdate.vehicle_number, dataToUpdate.order_id, dataToUpdate.scheduled_date,
                dataToUpdate.serial_no, dataToUpdate.status, dataToUpdate.started_at, dataToUpdate.completed_at,
                dataToUpdate.actual_ton, dataToUpdate.actual_m3, dataToUpdate.actual_pcs, dataToUpdate.actual_hr,
                dataToUpdate.actual_km, dataToUpdate.actual_waiting, dataToUpdate.actual_details, dataToUpdate.load_notes,
                dataToUpdate.is_sent_from_app, dataToUpdate.driver_user_id, Number(loadId)
            ]);
            return result.rows[0];

        } else {
            // ==========================================
            // 🆕 CREATE LOGIC (New Load Record)
            // ==========================================
            const vehicleNumber = getSafeNum(payload.vehicleNumber ?? payload.vehicle_number);
            const scheduledDate = payload.scheduledDate ?? payload.scheduled_date;

            // Generate Serial No
            const seqRes = await pool.query(
                `SELECT COALESCE(MAX(serial_no), -1) + 1 as next_seq FROM public.chip_loads WHERE vehicle_number = $1 AND scheduled_date = $2`,
                [vehicleNumber, scheduledDate]
            );
            const serialNo = getSafeNum(payload.serialNo ?? payload.serial_no ?? seqRes.rows[0].next_seq);

            const insertQuery = `
                INSERT INTO public.chip_loads (
                    title_id, vehicle_number, order_id, scheduled_date, serial_no, status,
                    started_at, completed_at, actual_ton, actual_m3, actual_pcs,
                    actual_hr, actual_km, actual_waiting, actual_details, load_notes,
                    is_sent_from_app, driver_user_id
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
                RETURNING *;
            `;

            const result = await pool.query(insertQuery, [
                getSafeNum(payload.titleId ?? payload.title_id),
                vehicleNumber,
                getSafeNum(payload.orderId ?? payload.order_id),
                scheduledDate,
                serialNo,
                payload.status ?? 'NOT_SENT',
                payload.startedAt ?? payload.started_at ?? null,
                payload.completedAt ?? payload.completed_at ?? null,
                getSafeNum(payload.actualTon ?? payload.actual_ton),
                getSafeNum(payload.actualM3 ?? payload.actual_m3),
                getSafeNum(payload.actualPcs ?? payload.actual_pcs),
                getSafeNum(payload.actualHr ?? payload.actual_hr),
                getSafeNum(payload.actualKm ?? payload.actual_km),
                getSafeNum(payload.actualWaiting ?? payload.actual_waiting),
                getSafeStr(payload.actualDetails ?? payload.actual_details),
                getSafeStr(payload.loadNotes ?? payload.load_notes),
                getSafeBool(payload.isSentFromApp ?? payload.is_sent_from_app ?? false),
                driverUserId
            ]);
            return result.rows[0];
        }
    },
    // 13. Search Loads - FIXED (Removed non-existent column u3.current_vehicle_id)
    searchLoads: async (filters: any) => {
        const { status, asiakasId, kalustoNro, startDate, endDate } = filters;
        let query = `
            SELECT 
                cl.*, ct.title_name as "titleName", ct.abbreviation, k.rek_nro as "vehicleRegNo",
                a.asiakkaan_nimi as "customerName", COALESCE(u1.nimi, u2.nimi, 'N/A') as "driverName", 
                ct.req_pcs, ct.req_m3, ct.req_ton, ct.req_hr, ct.req_waiting, ct.req_km, ct.req_details, ct.req_details_info
            FROM public.chip_loads cl
            JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            JOIN public.kalusto k ON cl.vehicle_number = k.kalusto_nro
            LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id 
            LEFT JOIN public.kayttajat u1 ON cl.driver_user_id = u1.kulj_id
            LEFT JOIN public.kayttajat u2 ON cl.requested_user_id = u2.kulj_id
            WHERE 1=1
        `;
        const params: any[] = [];
        if (status === 'active') { query += ` AND cl.status IN ('DISPATCHED', 'LOADED', 'UNLOADED')`; }
        else if (status === 'pending_inspection') { query += ` AND cl.status IN ('COMPLETED', 'SENT') AND COALESCE(cl.is_billed, false) = false`; }
        else if (status === 'all') { query += ` AND cl.status IN ('COMPLETED', 'SENT') AND cl.is_billed = true`; }

        if (startDate && endDate) { query += ` AND cl.scheduled_date BETWEEN $${params.length + 1} AND $${params.length + 2}`; params.push(startDate, endDate); }
        if (asiakasId) { query += ` AND ct.customer_id = $${params.length + 1}`; params.push(asiakasId); }
        if (kalustoNro) { query += ` AND cl.vehicle_number = $${params.length + 1}`; params.push(kalustoNro); }

        query += ` ORDER BY cl.scheduled_date DESC, cl.serial_no ASC`;
        const result = await pool.query(query, params);
        return result.rows;
    },

    // 14. Get load by ID - FIXED
    getLoadById: async (load_id: number) => {
        const query = `
            SELECT 
                cl.*, k.rek_nro as "vehicleRegNo", ct.title_name as "titleName", a.asiakkaan_nimi as "customerName",
                COALESCE(u1.nimi, u2.nimi, 'N/A') as "driverName"
            FROM public.chip_loads cl
            JOIN public.kalusto k ON cl.vehicle_number = k.kalusto_nro
            JOIN public.chip_titles ct ON cl.title_id = ct.title_id
            LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
            LEFT JOIN public.kayttajat u1 ON cl.driver_user_id = u1.kulj_id
            LEFT JOIN public.kayttajat u2 ON cl.requested_user_id = u2.kulj_id
            WHERE cl.load_id = $1`;
        const result = await pool.query(query, [load_id]);
        return result.rows[0];
    },

    // 🚀 CLAIM LOADS - UPDATED (Added SENT status for history)
    claimVehicleLoads: async (vehicleNumber: number, userId: number) => {
        const query = `
            UPDATE public.chip_loads 
            SET driver_user_id = $1 
            WHERE vehicle_number = $2 
              AND (driver_user_id IS NULL OR driver_user_id = 0)
            RETURNING *;
        `;
        const result = await pool.query(query, [userId, vehicleNumber]);
        return result.rows;
    },

    // 15. Get notifications
    getNotifications: async (userId: number) => {
        const query = `
        SELECT * FROM public.notifications 
        WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND $1 = 0)) 
        ORDER BY created_at DESC 
        LIMIT 50;
    `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },
    // 16. Mark notification as read
    markNotificationAsRead: async (notificationId: number) => {
        const query = `
    UPDATE public.notifications
    SET is_read = true 
    WHERE notification_id = $1 AND (is_read = false OR is_read IS NULL)
    RETURNING *;
`;
        const result = await pool.query(query, [notificationId]);
        return result.rows[0];
    },
    // 17. Mark all notifications as read
    markAllNotificationsAsRead: async (userId: number) => {
        const query = `
    UPDATE public.notifications 
    SET is_read = true 
    WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND $1 = 0))
      AND (is_read = false OR is_read IS NULL) 
      AND type != 'REASSIGNMENT_REQUEST' 
    RETURNING *;
`;
        const result = await pool.query(query, [userId]);
        return result.rows;
    },

    // 18. Get pending transfer requests
    getPendingTransferRequests: async (vehicleNumber: number) => {
        const query = `
        SELECT cl.*, ct.title_name, ct.abbreviation,
               p_load.nimi as loading_point_name, p_unload.purkupaikka as unloading_point_name
        FROM public.chip_loads cl
        JOIN public.chip_titles ct ON cl.title_id = ct.title_id
        LEFT JOIN public.puulaani p_load ON ct.loading_point_id = p_load.puulaani_id
        LEFT JOIN public.purkupaikka p_unload ON ct.unloading_point_id = p_unload.purkupaikka_id
        WHERE cl.requested_vehicle_number = $1 
        AND cl.transfer_status = 'PENDING';
    `;
        const result = await pool.query(query, [vehicleNumber]);
        return result.rows;
    },
    // 19. Clear read notifications
    clearReadNotifications: async (userId: number) => {
        const query = `DELETE FROM public.notifications WHERE (recipient_user_id = $1 OR (recipient_user_id IS NULL AND $1 = 0)) AND is_read = true`;
        await pool.query(query, [userId]);
        return { success: true };
    },
    // 20. Soft delete by marking as billed
    softDeleteDoneLoad: async (loadId: number) => {
        const query = `
    UPDATE public.chip_loads 
    SET is_billed = true, billed_date = CURRENT_DATE 
    WHERE load_id = $1 RETURNING *;
`;
        const result = await pool.query(query, [loadId]);
        return result.rows[0];
    },
    // 21. Bulk accept chip loads
    bulkAcceptChipLoads: async (loadIds: number[]) => {
        const query = `
        UPDATE public.chip_loads 
        SET is_billed = true, billed_date = CURRENT_DATE 
        WHERE load_id = ANY($1::int[])
        RETURNING *;
    `;
        const result = await pool.query(query, [loadIds]);
        return result.rows;
    },

};
