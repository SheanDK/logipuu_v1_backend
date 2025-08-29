// backend/src/queries/userQueries/updateUserQueries.ts

export const UPDATE_USER_OWN_FULLNAME = `
    UPDATE public.kayttajat
    SET nimi = $1
    WHERE tunnus = $2
    RETURNING nimi;
`;

export const UPDATE_DRIVER_email_BY_kulj_id = `
    UPDATE public.kuljettajat
    SET email = $1
    WHERE kulj_id = $2
    RETURNING email;
`;

export const UPDATE_USER_OWN_PASSWORD = `
    UPDATE public.kayttajat
    SET salasana = $1
    WHERE tunnus = $2;
`;

// This query only updates the fields that are always present in the update DTO.
export const UPDATE_USER_BY_ADMIN = `
    UPDATE public.kayttajat
    SET nimi = $1, aktiivinen = $2
    WHERE tunnus = $3
    RETURNING tunnus;
`;

export const DELETE_USER_ROLE_MAPPINGS_BY_tunnus = `
    DELETE FROM public.kayttaja_roolit WHERE kayttaja_tunnus = $1;
`;