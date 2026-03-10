// backend/src/queries/driverQueries/createDriverQueries.ts

// 1. INSERT_DRIVER
export const INSERT_DRIVER = `
    INSERT INTO public.kuljettajat (nimi, puhelin_nro, email, halytys) 
    VALUES ($1, $2, $3, $4)
    RETURNING *;
`;