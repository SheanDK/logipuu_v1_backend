// backend/src/queries/unloadingSiteQueries/updateUnloadingSiteQueries.ts
export const UPDATE_UNLOADING_SITE_BY_ID = `
    UPDATE public.purkupaikka
    SET asiakas_id = $1, purkupaikka = $2, sijainti_lat = $3, sijainti_long = $4
    WHERE purkupaikka_id = $5
    RETURNING purkupaikka_id;
`;