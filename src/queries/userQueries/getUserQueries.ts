// backend/src/queries/userQueries/getUserQueries.ts

// backend/src/queries/userQueries/getUserQueries.ts

// NOTE: We are REMOVING all "AS camelCase" aliases.
// The `camelcase-keys` library in `db.ts` will automatically handle the conversion
// from snake_case (e.g., kulj_id) to camelCase (e.g., kuljId).

export const SELECT_USER_PROFILE_BY_tunnus = `
    SELECT
        k.tunnus,
        k.nimi,
        k.kulj_id, -- Corrected from kuljid and alias removed
        COALESCE(array_agg(r.roolin_nimi) FILTER (WHERE r.roolin_nimi IS NOT NULL), '{}') as roles,
        kj.email AS driver_email -- We can give it a clear snake_case name
    FROM public.kayttajat k
    LEFT JOIN public.kayttaja_roolit kr ON k.tunnus = kr.kayttaja_tunnus
    LEFT JOIN public.roolit r ON kr.rooli_id = r.rooli_id
    LEFT JOIN public.kuljettajat kj ON k.kulj_id = kj.kulj_id 
    WHERE k.tunnus = $1 AND k.aktiivinen = TRUE
    GROUP BY k.tunnus, k.nimi, k.kulj_id, kj.email;
`;

export const SELECT_KAYTTAJAT_PASSWORD_BY_tunnus = `
    SELECT salasana FROM public.kayttajat WHERE tunnus = $1 AND aktiivinen = TRUE;
`;

// CORRECTED: The query that caused the error is now fixed.
export const SELECT_ALL_USERS_FOR_ADMIN = `
    SELECT
        k.tunnus,
        k.nimi,
        k.taso,
        k.aktiivinen,
        k.kulj_id, -- <<<--- FIX IS HERE: Changed from 'kuljid' to 'kulj_id'. Alias is removed.
        COALESCE(array_agg(r.roolin_nimi) FILTER (WHERE r.roolin_nimi IS NOT NULL), '{}') as roles
    FROM public.kayttajat k
    LEFT JOIN public.kayttaja_roolit kr ON k.tunnus = kr.kayttaja_tunnus
    LEFT JOIN public.roolit r ON kr.rooli_id = r.rooli_id
    GROUP BY k.tunnus, k.nimi, k.taso, k.aktiivinen, k.kulj_id
    ORDER BY k.nimi ASC;
`;

export const SELECT_USER_BY_tunnus_FOR_ADMIN = `
    SELECT
        k.tunnus,
        k.nimi,
        k.taso,
        k.aktiivinen,
        k.kulj_id -- Corrected from kuljid and alias removed
    FROM public.kayttajat k
    WHERE k.tunnus = $1;
`;

export const SELECT_USER_ROLE_IDS_BY_TUNNUS = `
    SELECT rooli_id FROM public.kayttaja_roolit WHERE kayttaja_tunnus = $1;
`;