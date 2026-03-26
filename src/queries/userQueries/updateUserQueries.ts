// backend/src/queries/userQueries/updateUserQueries.ts

// 1. UPDATE_USER_OWN_FULLNAME
export const UPDATE_USER_OWN_FULLNAME = `
    UPDATE public.kayttajat
    SET nimi = $1
    WHERE tunnus = $2
    RETURNING nimi;
`;

// 2. UPDATE_DRIVER_email_BY_kulj_id
export const UPDATE_DRIVER_email_BY_kulj_id = `
    UPDATE public.kuljettajat
    SET email = $1
    WHERE kulj_id = $2
    RETURNING email;
`;

// 3. UPDATE_USER_OWN_PASSWORD
export const UPDATE_USER_OWN_PASSWORD = `
    UPDATE public.kayttajat
    SET salasana = $1
    WHERE tunnus = $2;
`;

// 4. UPDATE_USER_BY_ADMIN
export const UPDATE_USER_BY_ADMIN = `
    UPDATE public.kayttajat
    SET nimi = $1, aktiivinen = $2
    WHERE tunnus = $3
    RETURNING tunnus;
`;

// 5. DELETE_USER_ROLE_MAPPINGS_BY_tunnus
export const DELETE_USER_ROLE_MAPPINGS_BY_tunnus = `
    DELETE FROM public.kayttaja_roolit WHERE kayttaja_tunnus = $1;
`;

// 6. UPDATE_USER_CURRENT_VEHICLE
export const UPDATE_USER_CURRENT_VEHICLE = `
    UPDATE public.kayttajat
    SET current_vehicle_id = $1
    WHERE tunnus = $2
    RETURNING current_vehicle_id;
`;