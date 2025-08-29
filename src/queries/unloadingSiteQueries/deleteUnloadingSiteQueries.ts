// backend/src/queries/unloadingSiteQueries/deleteUnloadingSiteQueries.ts
export const DELETE_UNLOADING_SITE_BY_ID = `
    DELETE FROM public.purkupaikka WHERE purkupaikka_id = $1 RETURNING purkupaikka_id;
`;