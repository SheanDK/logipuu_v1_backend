// backend/src/queries/vehicleQueries/getVehicleQueries.ts

export const SELECT_ALL_VEHICLES = `
    SELECT * FROM public.kalusto ORDER BY kalusto_nro ASC; -- CORRECTED: Simplified query
`;

export const SELECT_VEHICLE_BY_ID = `
    SELECT * FROM public.kalusto WHERE kalusto_nro = $1; -- CORRECTED: Simplified query
`;

// Checks if a registration number exists, optionally excluding a specific vehicle ID.
export const CHECK_REGISTRATION_NO_EXISTS = `
    SELECT 1 FROM public.kalusto
    WHERE rek_nro = $1 AND ($2::integer IS NULL OR kalusto_nro != $2::integer)
    LIMIT 1;
`;