// backend/src/queries/driverQueries/getDriverQueries.ts

export const SELECT_ALL_DRIVERS = `
    SELECT * FROM public.kuljettajat ORDER BY nimi ASC; -- CORRECTED: Simplified query
`;

export const SELECT_DRIVER_BY_ID = `
    SELECT * FROM public.kuljettajat WHERE kulj_id = $1; -- CORRECTED: Simplified query
`;