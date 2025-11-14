export const COUNT_DRIVER_TODAY_ASSIGNED_LOADS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE kulj_id = $1 AND status = 'Assigned' AND pvm::date = CURRENT_DATE;
`;

export const COUNT_DRIVER_TODAY_COMPLETED_LOADS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE kulj_id = $1 AND status = 'Completed' AND pvm::date = CURRENT_DATE;
`;

export const COUNT_DRIVER_WEEK_TOTAL_LOADS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE kulj_id = $1 AND pvm::date >= (CURRENT_DATE - INTERVAL '6 days') AND pvm::date <= CURRENT_DATE;
`;

export const COUNT_DRIVER_UPCOMING_LOADS = `
    SELECT COUNT(kuorma_id) FROM public.kuorma WHERE kulj_id = $1 AND status = 'Assigned' AND pvm::date > CURRENT_DATE;
`;