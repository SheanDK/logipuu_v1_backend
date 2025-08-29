// backend/src/queries/dashboardQueries/driverDashboardQueries.ts

export const COUNT_DRIVER_TODAY_ASSIGNED_LOADS = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE kulj_id = $1 AND pvm::date = CURRENT_DATE AND laskutukseen != 2;
`;

export const COUNT_DRIVER_TODAY_COMPLETED_LOADS = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE kulj_id = $1 AND pvm::date = CURRENT_DATE AND laskutukseen = 2;
`;

export const COUNT_DRIVER_WEEK_TOTAL_LOADS = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE kulj_id = $1 AND pvm::date >= date_trunc('week', CURRENT_DATE) AND pvm::date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week';
`;

export const COUNT_DRIVER_UPCOMING_LOADS = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE kulj_id = $1 AND pvm::date >= CURRENT_DATE AND laskutukseen != 2;
`;