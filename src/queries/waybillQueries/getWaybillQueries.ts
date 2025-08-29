// backend/src/queries/waybillQueries/getWaybillQueries.ts
export const SELECT_ALL_WAYBILLS = `
    SELECT * FROM public.rahtikirja ORDER BY pvm DESC, rahti_id DESC;
`;

export const SELECT_WAYBILL_BY_ID = `
    SELECT * FROM public.rahtikirja WHERE rahti_id = $1;
`;