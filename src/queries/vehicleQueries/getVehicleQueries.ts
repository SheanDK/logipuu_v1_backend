// backend/src/queries/vehicleQueries/getVehicleQueries.ts

// 1. SELECT_ALL_VEHICLES
export const SELECT_ALL_VEHICLES = `
    SELECT 
    v.kalusto_nro AS "kalustoNro", 
    v.rek_nro AS "rekNro", 
    v.aktiivinen,
    v.katsastus_aik AS "nextInspectionDate",
    v.ed_katsastus AS "previousInspectionDate",
    (SELECT u.nimi FROM public.driver_active_sessions s 
     JOIN public.kayttajat u ON s.user_id = u.kulj_id 
     WHERE s.vehicle_id = v.kalusto_nro LIMIT 1) AS current_driver_name,
    (SELECT u.tunnus FROM public.driver_active_sessions s 
     JOIN public.kayttajat u ON s.user_id = u.kulj_id 
     WHERE s.vehicle_id = v.kalusto_nro LIMIT 1) AS current_driver_tunnus
FROM public.kalusto v
WHERE v.aktiivinen = true
ORDER BY v.rek_nro ASC;
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