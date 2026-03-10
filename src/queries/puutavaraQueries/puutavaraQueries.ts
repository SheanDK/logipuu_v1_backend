// backend/src/queries/puutavaraQueries/puutavaraQueries.ts

// 1. SELECT_ALL_PUUTAVARAT
export const SELECT_ALL_PUUTAVARAT = `
    SELECT puutavara_nro, puutavara FROM public.puutavarat WHERE aktiivinen = TRUE ORDER BY puutavara ASC;
`;