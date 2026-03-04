// backend/src/queries/vehicleQueries/deleteVehicleQueries.ts

// 1. DELETE_VEHICLE_BY_ID
export const DELETE_VEHICLE_BY_ID = `
    DELETE FROM public.kalusto 
    WHERE kalusto_nro = $1 
    RETURNING kalusto_nro;
`;