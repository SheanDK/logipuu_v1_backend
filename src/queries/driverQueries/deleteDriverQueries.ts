// backend/src/queries/driverQueries/deleteDriverQueries.ts

export const DELETE_DRIVER_BY_ID = `
    DELETE FROM public.kuljettajat 
    WHERE kulj_id = $1 
    RETURNING kulj_id; -- CORRECTED: Return original column name.
`;