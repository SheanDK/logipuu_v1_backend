//backend/src/queries/dashboardQueries/adminDashboardQueries.ts
export const COUNT_ACTIVE_TIMBER_STACKS = `
    SELECT COUNT(*) FROM public.puulaani 
    WHERE aktiivinen = TRUE AND valmis = FALSE;
`;

export const COUNT_LOADS_COMPLETED_TODAY = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status = 'Completed' AND pvm::date = CURRENT_DATE;
`;

export const COUNT_PENDING_BILLINGS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status = 'Completed' AND (laskutukseen IS NULL OR laskutukseen = 0);
`;

export const COUNT_VEHICLES_NEEDING_INSPECTION = `
    SELECT COUNT(kalusto_nro) FROM public.kalusto WHERE katsastus_aik IS NOT NULL AND katsastus_aik::date <= (CURRENT_DATE + INTERVAL '30 days');
`;

export const COUNT_ACTIVE_VEHICLES = `
    SELECT COUNT(kalusto_nro) FROM public.kalusto WHERE aktiivinen = TRUE;
`;

export const COUNT_ACTIVE_DRIVERS = `
    SELECT COUNT(kulj_id) FROM public.kuljettajat WHERE halytys = TRUE;
`;

// -- Chart and other widgets for Admin --
export const GET_VOLUME_LAST_7_DAYS = `
    WITH date_series AS (
        SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as day
    )
    SELECT 
        -- FIX: Return standard ISO date format (YYYY-MM-DD)
        to_char(ds.day, 'YYYY-MM-DD') as date, 
        COALESCE(SUM(k.m3), 0) as volume
    FROM date_series ds
    LEFT JOIN public.kuorma k ON k.pvm::date = ds.day AND k.status = 'Completed'
    GROUP BY ds.day
    ORDER BY ds.day ASC;
`;

export const COUNT_ACTIVE_CUSTOMERS = `SELECT COUNT(*) FROM public.asiakkaat WHERE aktiivinen = true`;

export const SUM_TOTAL_VOLUME_TODAY = `SELECT SUM(m3) FROM public.kuorma WHERE pvm = CURRENT_DATE AND is_active = true`;

export const COUNT_UNBILLED_CONSIGNMENTS = `
    SELECT COUNT(*) FROM public.rahtikirja r 
    JOIN public.kuorma k ON r.kuorma_id = k.kuorma_id 
    WHERE k.pvm_laskutus IS NULL AND k.is_active = true`;