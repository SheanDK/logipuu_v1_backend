//backend/src/queries/dashboardQueries/dispatchDashboardQueries.ts
export const COUNT_ACTIVE_LOADS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status IN ('In Progress', 'En Route to Destination', 'At Origin', 'At Destination');
`;

export const COUNT_AVAILABLE_DRIVERS = `
    SELECT COUNT(kulj_id) FROM public.kuljettajat WHERE halytys = TRUE AND kulj_id NOT IN (
        SELECT DISTINCT kulj_id FROM public.kuorma WHERE status IN ('In Progress', 'En Route to Destination')
    );
`;

export const COUNT_AVAILABLE_VEHICLES = `
    SELECT COUNT(kalusto_nro) FROM public.kalusto WHERE aktiivinen = TRUE AND kalusto_nro NOT IN (
        SELECT DISTINCT kalusto_nro FROM public.kuorma WHERE status IN ('In Progress', 'En Route to Destination')
    );
`;

export const SUM_REMAINING_VOLUME_ACTIVE_STACKS = `
    SELECT COALESCE(SUM(jaljella), 0) FROM public.puulaani 
    WHERE aktiivinen = TRUE AND valmis = FALSE;
`;

export const COUNT_UPCOMING_LOADS_TODAY = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE status = 'Assigned' AND pvm::date = CURRENT_DATE;
`;

// -- Active Trips List for Dispatcher --
export const GET_ACTIVE_TRIPS_LIST = `
    SELECT
        k.ajomaarays_nro as "ajomaaraysNro",
        kul.nimi as "driverName",
        kal.rek_nro as "vehicleRegNo",
        -- Get the most "active" status for the trip (e.g., 'In Progress' is more important than 'At Origin')
        MIN(k.status) as status,
        -- Calculate progress based on ALL loads in the trip
        ROUND(
            (SUM(CASE WHEN k.status = 'Completed' THEN 1 ELSE 0 END)::decimal / COUNT(k.kuorma_id)) * 100
        ) as progress
    FROM public.kuorma k
    LEFT JOIN public.kuljettajat kul ON k.kulj_id = kul.kulj_id
    LEFT JOIN public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
    WHERE k.ajomaarays_nro IN (
        SELECT DISTINCT ajomaarays_nro FROM public.kuorma 
        WHERE status NOT IN ('Completed', 'Assigned', 'Paused') -- More robust status check
    ) AND k.ajomaarays_nro IS NOT NULL
    GROUP BY k.ajomaarays_nro, kul.nimi, kal.rek_nro -- 'k.status' is removed from GROUP BY
    ORDER BY k.ajomaarays_nro DESC
    LIMIT 5;
`;