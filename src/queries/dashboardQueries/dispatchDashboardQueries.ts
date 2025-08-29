// backend/src/queries/dashboardQueries/dispatchDashboardQueries.ts

export const COUNT_ACTIVE_LOADS = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE laskutukseen != 2;
`;

export const COUNT_AVAILABLE_DRIVERS = `
    SELECT COUNT(*) FROM public.kuljettajat;
`;

export const COUNT_AVAILABLE_VEHICLES = `
    SELECT COUNT(*) FROM public.kalusto
    WHERE aktiivinen = TRUE;
`;

export const SUM_REMAINING_VOLUME_ACTIVE_STACKS = `
    SELECT SUM(jaljella) AS total_remaining_volume
    FROM public.puulaani
    WHERE aktiivinen = TRUE AND valmis = FALSE;
`;

export const COUNT_UPCOMING_LOADS_TODAY = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE pvm::date = CURRENT_DATE AND laskutukseen != 2;
`;