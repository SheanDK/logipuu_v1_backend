// backend/src/queries/vehicleQueries/updateVehicleQueries.ts

// 1. UPDATE_VEHICLE_BY_ID
export const UPDATE_VEHICLE_BY_ID = `
    UPDATE public.kalusto 
    SET rek_nro = $1, ed_katsastus = $2, katsastus_aik = $3, aktiivinen = $4 
    WHERE kalusto_nro = $5
    RETURNING *;
`;