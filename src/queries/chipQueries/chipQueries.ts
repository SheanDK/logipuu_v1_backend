// backend/src/queries/chipQueries/chipQueries.ts
export const chipQueries = {
    // TITLES
    getAllTitles: `
        SELECT ct.*, a.asiakkaan_nimi as customer_name, p.nimi as loading_point_name,
               pp.purkupaikka as unloading_point_name, pt.puutavara as product_name
        FROM public.chip_titles ct
        LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
        LEFT JOIN public.puulaani p ON ct.loading_point_id = p.puulaani_id
        LEFT JOIN public.purkupaikka pp ON ct.unloading_point_id = pp.purkupaikka_id
        LEFT JOIN public.puutavarat pt ON ct.product_number = pt.puutavara_nro
        ORDER BY ct.title_id DESC`,

    // ORDERS
    getActiveOrders: `
        SELECT co.*, a.asiakkaan_nimi as "customerName", ct.abbreviation, pt.puutavara as "productType",
               (SELECT COUNT(*) FROM public.chip_loads cl WHERE cl.order_id = co.order_id) as "scheduledCount"
        FROM public.chip_orders co
        LEFT JOIN public.chip_titles ct ON co.title_id = ct.title_id
        LEFT JOIN public.asiakkaat a ON ct.customer_id = a.asiakkaan_id
        LEFT JOIN public.puutavarat pt ON ct.product_number = pt.puutavara_nro
        WHERE co.is_active = true ORDER BY co.order_id DESC`,

    // PLANNING
    getWeeklyPlan: `
        SELECT k.kalusto_nro as "kalustoNro", k.rek_nro as "rekNro", cl.load_id as "loadId", 
               cl.order_id as "orderId", TO_CHAR(cl.scheduled_date, 'YYYY-MM-DD') as "date", 
               cl.status, cl.serial_no as "serialNo", cl.actual_m3 as "actualM3",
               COALESCE(ct.title_name, '') as "titleName", COALESCE(ct.abbreviation, '') as "abbreviation",
               co.target_qty as "targetQty", co.weekly_dist as "weeklyDist"
        FROM public.kalusto k
        LEFT JOIN public.chip_loads cl ON k.kalusto_nro = cl.vehicle_number 
            AND EXTRACT(WEEK FROM cl.scheduled_date) = $1 
            AND EXTRACT(YEAR FROM cl.scheduled_date) = $2
        LEFT JOIN public.chip_titles ct ON cl.title_id = ct.title_id
        LEFT JOIN public.chip_orders co ON cl.order_id = co.order_id
        WHERE k.aktiivinen = true ORDER BY k.rek_nro, cl.scheduled_date, cl.serial_no`
};