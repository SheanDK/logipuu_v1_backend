// backend/src/queries/mapQueries/otherMarkerQueries.ts

export const SELECT_ALL_OTHER_MARKERS = `SELECT * FROM public.muutieto;`;

export const SELECT_OTHER_MARKER_BY_ID = `SELECT * FROM public.muutieto WHERE muutieto_id = $1;`;

export const INSERT_OTHER_MARKER = `
    INSERT INTO public.muutieto (nimi, tyyppi, lisatieto, vari, sijainti_lat, sijainti_long)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
`;

export const UPDATE_OTHER_MARKER = `
    UPDATE public.muutieto
    SET nimi = $1, tyyppi = $2, lisatieto = $3, vari = $4, sijainti_lat = $5, sijainti_long = $6
    WHERE muutieto_id = $7
    RETURNING *;
`;

export const DELETE_OTHER_MARKER = `
    DELETE FROM public.muutieto WHERE muutieto_id = $1 RETURNING muutieto_id;
`;