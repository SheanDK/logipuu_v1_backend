// backend/src/queries/driverQueries/updateDriverQueries.ts

// 1. UPDATE_DRIVER_BY_ID
export const UPDATE_DRIVER_BY_ID = `
    UPDATE public.kuljettajat 
    SET nimi = $1, puhelin_nro = $2, email = $3, halytys = $4 
    WHERE kulj_id = $5
    RETURNING *;
`;