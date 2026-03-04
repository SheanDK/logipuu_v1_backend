// backend/src/queries/userQueries/deleteUserQueries.ts

// 1. DELETE_USER_BY_tunnus_BY_ADMIN
export const DELETE_USER_BY_tunnus_BY_ADMIN = `
    DELETE FROM public.kayttajat
    WHERE tunnus = $1
    RETURNING tunnus, nimi;
`;