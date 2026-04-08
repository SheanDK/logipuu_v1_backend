// backend/src/queries/vehicleQueries/getVehicleQueries.ts

// 1. SELECT_ALL_VEHICLES
export const SELECT_ALL_VEHICLES = `
    SELECT 
        v.*, 
        k.tunnus AS current_driver_tunnus,
        k.nimi AS current_driver_name
    FROM public.kalusto v
    LEFT JOIN public.kayttajat k ON v.kalusto_nro = k.current_vehicle_id AND k.aktiivinen = true
    ORDER BY v.kalusto_nro ASC;
`;

// 2. SELECT_VEHICLE_BY_ID
export const SELECT_VEHICLE_BY_ID = `
    SELECT * FROM public.kalusto WHERE kalusto_nro = $1;
`;

// 3. CHECK_REGISTRATION_NO_EXISTS
export const CHECK_REGISTRATION_NO_EXISTS = `
    SELECT 1 FROM public.kalusto
    WHERE rek_nro = $1 AND ($2::integer IS NULL OR kalusto_nro != $2::integer)
    LIMIT 1;
`;