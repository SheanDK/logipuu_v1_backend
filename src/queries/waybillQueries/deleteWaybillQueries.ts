// backend/src/queries/waybillQueries/deleteWaybillQueries.ts
export const DELETE_WAYBILL_BY_ID = `
    DELETE FROM public.rahtikirja WHERE rahti_id = $1 RETURNING rahti_id;
`;

