// backend/src/queries/authQueries.ts

// 1. findUserByTunnusWithRolesAndPermissionsQuery
export const findUserByTunnusWithRolesAndPermissionsQuery = `
    SELECT
        k.tunnus,
        k.nimi,
        k.salasana,
        k.aktiivinen,
        k.taso,
        k.kulj_id,
        kj.email AS driver_email,
        COALESCE(
            array_agg(DISTINCT r.roolin_nimi) FILTER (WHERE r.roolin_nimi IS NOT NULL), 
            '{}'
        ) AS roles,
        COALESCE(
            array_agg(DISTINCT p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL),
            '{}'
        ) AS permissions
    FROM 
        public.kayttajat k
    LEFT JOIN 
        public.kuljettajat kj ON k.kulj_id = kj.kulj_id
    LEFT JOIN 
        public.kayttaja_roolit kr ON k.tunnus = kr.kayttaja_tunnus
    LEFT JOIN 
        public.roolit r ON kr.rooli_id = r.rooli_id
    LEFT JOIN 
        public.role_permissions rp ON r.rooli_id = rp.rooli_id
    LEFT JOIN 
        public.permissions p ON rp.permission_id = p.permission_id
    WHERE 
        k.tunnus = $1
    GROUP BY
        k.tunnus, k.nimi, k.salasana, k.aktiivinen, k.taso, k.kulj_id, kj.email;
`;