// backend/src/queries/unloadingSiteQueries/getUnloadingSiteQueries.ts

export const SELECT_ALL_UNLOADING_SITES = `
    SELECT
        p.*,
        a.asiakkaan_nimi AS client_name,
        a.kohteen_vari AS client_color
    FROM public.purkupaikka p
    LEFT JOIN public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
    -- --- ADD THIS CONDITION ---
    WHERE p.is_active = TRUE
    ORDER BY p.purkupaikka_id DESC;
`;

// This query can remain as is, to allow fetching a specific site even if it's inactive (for historical data)
export const SELECT_UNLOADING_SITE_BY_ID = `
    SELECT
        p.*,
        a.asiakkaan_nimi AS client_name,
        a.kohteen_vari AS client_color
    FROM public.purkupaikka p
    LEFT JOIN public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
    WHERE p.purkupaikka_id = $1;
`;

export const SELECT_UNLOADING_SITES_BY_CLIENT_ID = `
    SELECT * 
    FROM public.purkupaikka 
    -- --- ADD THIS CONDITION ---
    WHERE asiakas_id = $1 AND is_active = TRUE 
    ORDER BY purkupaikka ASC;
`;