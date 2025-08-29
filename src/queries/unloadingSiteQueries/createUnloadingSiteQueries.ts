// backend/src/queries/unloadingSiteQueries/createUnloadingSiteQueries.ts
export const INSERT_UNLOADING_SITE = `
    INSERT INTO public.purkupaikka (asiakas_id, purkupaikka, sijainti_lat, sijainti_long)
    VALUES ($1, $2, $3, $4)
    RETURNING purkupaikka_id;
`;