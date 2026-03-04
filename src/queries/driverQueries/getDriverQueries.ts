// backend/src/queries/driverQueries/getDriverQueries.ts

// 1. SELECT_ALL_DRIVERS
export const SELECT_ALL_DRIVERS = `
    SELECT * FROM public.kuljettajat ORDER BY nimi ASC;
`;

// 2. SELECT_DRIVER_BY_ID
export const SELECT_DRIVER_BY_ID = `
    SELECT * FROM public.kuljettajat WHERE kulj_id = $1;
`;