//backend/src/queries/dashboardQueries/adminDashboardQueries.ts

// 1. COUNT_ACTIVE_TIMBER_STACKS
export const COUNT_ACTIVE_TIMBER_STACKS = `
    SELECT COUNT(*) FROM public.puulaani 
    WHERE aktiivinen = TRUE AND valmis = FALSE;
`;

// 2. COUNT_LOADS_COMPLETED_TODAY
export const COUNT_LOADS_COMPLETED_TODAY = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status = 'Completed' AND pvm::date = CURRENT_DATE;
`;

// 3. COUNT_PENDING_BILLINGS
export const COUNT_PENDING_BILLINGS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status = 'Completed' AND (laskutukseen IS NULL OR laskutukseen = 0);
`;

// 4. COUNT_VEHICLES_NEEDING_INSPECTION
export const COUNT_VEHICLES_NEEDING_INSPECTION = `
    SELECT COUNT(kalusto_nro) FROM public.kalusto WHERE katsastus_aik IS NOT NULL AND katsastus_aik::date <= (CURRENT_DATE + INTERVAL '30 days');
`;

// 5. COUNT_ACTIVE_VEHICLES
export const COUNT_ACTIVE_VEHICLES = `
    SELECT COUNT(kalusto_nro) FROM public.kalusto WHERE aktiivinen = TRUE;
`;

// 6. COUNT_ACTIVE_DRIVERS
export const COUNT_ACTIVE_DRIVERS = `
    SELECT COUNT(kulj_id) FROM public.kuljettajat WHERE halytys = TRUE;
`;

// 7. GET_VOLUME_LAST_7_DAYS
export const GET_VOLUME_LAST_7_DAYS = `
    WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as day
    )
    SELECT 
            -- Return standard ISO date format (YYYY-MM-DD)
        to_char(ds.day, 'YYYY-MM-DD') as date, 
        COALESCE(SUM(k.m3), 0) as volume
    FROM date_series ds
    LEFT JOIN public.kuorma k ON k.pvm::date = ds.day AND k.status = 'Completed'
    GROUP BY ds.day
    ORDER BY ds.day ASC;
`;

// 8. COUNT_ACTIVE_CUSTOMERS
export const COUNT_ACTIVE_CUSTOMERS = `SELECT COUNT(*) FROM public.asiakkaat WHERE aktiivinen = true`;

// 9. SUM_TOTAL_VOLUME_TODAY
export const SUM_TOTAL_VOLUME_TODAY = `SELECT SUM(m3) FROM public.kuorma WHERE pvm = CURRENT_DATE AND is_active = true`;

// 10. COUNT_UNBILLED_CONSIGNMENTS
export const COUNT_UNBILLED_CONSIGNMENTS = `
    SELECT COUNT(*) FROM public.rahtikirja r 
    JOIN public.kuorma k ON r.kuorma_id = k.kuorma_id 
    WHERE k.pvm_laskutus IS NULL AND k.is_active = true`;