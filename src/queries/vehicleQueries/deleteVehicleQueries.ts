// backend/src/queries/vehicleQueries/deleteVehicleQueries.ts

export const DELETE_VEHICLE_BY_ID = `
    DELETE FROM public.kalusto 
    WHERE kalusto_nro = $1 
    RETURNING kalusto_nro; -- CORRECTED: Return original column name.
`;