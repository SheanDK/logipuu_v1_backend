// backend/src/queries/clientQueries/getClientQueries.ts

// 1. SELECT_ALL_CLIENTS
export const SELECT_ALL_CLIENTS = `
    SELECT * FROM public.asiakkaat ORDER BY asiakkaan_nimi ASC;
`;

// 2. SELECT_CLIENT_BY_ID
export const SELECT_CLIENT_BY_ID = `
    SELECT * FROM public.asiakkaat WHERE asiakkaan_id = $1;
`;

// 3. CHECK_IF_COLOR_IS_IN_USE
export const CHECK_IF_COLOR_IS_IN_USE = `
  SELECT 1
  FROM public.asiakkaat
  WHERE kohteen_vari = $1
    AND ( $2::bigint IS NULL OR asiakkaan_id != $2::bigint )
  LIMIT 1;
`;