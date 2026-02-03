// backend/src/queries/userQueries/createUserQueries.ts

// This query expects ALL parameters to be provided by the service.
export const INSERT_NEW_USER_BY_ADMIN = `
    INSERT INTO public.kayttajat (tunnus, nimi, salasana, aktiivinen, taso, kulj_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING tunnus;
`;

export const ADD_USER_ROLE_MAPPING = `
    INSERT INTO public.kayttaja_roolit (kayttaja_tunnus, rooli_id) VALUES ($1, $2);
`;