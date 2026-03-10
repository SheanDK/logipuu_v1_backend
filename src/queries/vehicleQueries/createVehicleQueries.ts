// backend/src/queries/vehicleQueries/createVehicleQueries.ts

// 1. INSERT_VEHICLE
export const INSERT_VEHICLE = `
    INSERT INTO public.kalusto (rek_nro, ed_katsastus, katsastus_aik, aktiivinen) 
    VALUES ($1, $2, $3, $4)
    RETURNING *;
`;