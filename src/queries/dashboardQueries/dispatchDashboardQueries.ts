//backend/src/queries/dashboardQueries/dispatchDashboardQueries.ts

// 1. COUNT_ACTIVE_LOADS
export const COUNT_ACTIVE_LOADS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status IN ('In Progress', 'En Route to Destination', 'At Origin', 'At Destination');
`;

// 2. COUNT_AVAILABLE_DRIVERS
export const COUNT_AVAILABLE_DRIVERS = `
    SELECT COUNT(kulj_id) FROM public.kuljettajat WHERE halytys = TRUE AND kulj_id NOT IN (
        SELECT DISTINCT kulj_id FROM public.kuorma WHERE status IN ('In Progress', 'En Route to Destination')
    );
`;

// 3. COUNT_AVAILABLE_VEHICLES
export const COUNT_AVAILABLE_VEHICLES = `
    SELECT COUNT(kalusto_nro) FROM public.kalusto WHERE aktiivinen = TRUE AND kalusto_nro NOT IN (
        SELECT DISTINCT kalusto_nro FROM public.kuorma WHERE status IN ('In Progress', 'En Route to Destination')
    );
`;

// 4. SUM_REMAINING_VOLUME_ACTIVE_STACKS
export const SUM_REMAINING_VOLUME_ACTIVE_STACKS = `
    SELECT COALESCE(SUM(jaljella), 0) FROM public.puulaani 
    WHERE aktiivinen = TRUE AND valmis = FALSE;
`;

// 5. COUNT_UPCOMING_LOADS_TODAY
export const COUNT_UPCOMING_LOADS_TODAY = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status = 'Assigned' AND pvm::date = CURRENT_DATE;
`;

// 6. GET_ACTIVE_TRIPS_LIST
export const GET_ACTIVE_TRIPS_LIST = `
    SELECT
        k.ajomaarays_nro as "ajomaaraysNro",
        kul.nimi as "driverName",
        kal.rek_nro as "vehicleRegNo",
        MIN(k.status) as status,
        ROUND(
            (SUM(CASE WHEN k.status = 'Completed' THEN 1 ELSE 0 END)::decimal / COUNT(k.kuorma_id)) * 100
        ) as progress
    FROM public.kuorma k
    LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
    LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
    WHERE k.ajomaarays_nro IN (
        SELECT DISTINCT ajomaarays_nro FROM public.kuorma 
        WHERE status NOT IN ('Completed', 'Assigned', 'Paused')
    ) AND k.ajomaarays_nro IS NOT NULL
    GROUP BY k.ajomaarays_nro, kul.nimi, kal.rek_nro
    ORDER BY k.ajomaarays_nro DESC
    LIMIT 5;
`;