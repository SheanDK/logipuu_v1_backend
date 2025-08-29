// backend/src/queries/dashboardQueries/adminDashboardQueries.ts

export const COUNT_ACTIVE_TIMBER_STACKS = `
    SELECT COUNT(*) FROM public.puulaani
    WHERE aktiivinen = TRUE AND valmis = FALSE;
`;

export const COUNT_LOADS_COMPLETED_TODAY = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE pvm::date = CURRENT_DATE AND laskutukseen = 2;
`;

export const COUNT_PENDING_BILLINGS = `
    SELECT COUNT(*) FROM public.kuorma
    WHERE laskutukseen = 1;
`;

export const COUNT_VEHICLES_NEEDING_INSPECTION = `
    SELECT COUNT(*) FROM public.kalusto
    WHERE aktiivinen = TRUE AND katsastus_aik::date <= (CURRENT_DATE + INTERVAL '30 days');
`;

export const COUNT_ACTIVE_VEHICLES = `
    SELECT COUNT(*) FROM public.kalusto
    WHERE aktiivinen = TRUE;
`;

export const COUNT_ACTIVE_DRIVERS = `
    SELECT COUNT(*) FROM public.kuljettajat;
`;