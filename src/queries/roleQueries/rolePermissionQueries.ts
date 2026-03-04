// backend/src/queries/rolePermissionQueries.ts

// 1. SELECT_ALL_ROLES_WITH_PERMISSIONS
export const SELECT_ALL_ROLES_WITH_PERMISSIONS = `
    SELECT
        r.rooli_id as "rooliId",
        r.roolin_nimi as "roolinNimi",
        -- CORRECTED: The service now expects an array of permission OBJECTS, not just names.
        -- This query should join and aggregate full permission objects.
        -- Let's change this to get permission IDs instead, which is simpler for the backend.
        COALESCE(jsonb_agg(p.permission_id) FILTER (WHERE p.permission_id IS NOT NULL), '[]'::jsonb) as "permissionIds"
    FROM public.roolit r
    LEFT JOIN public.role_permissions rp ON r.rooli_id = rp.rooli_id
    LEFT JOIN public.permissions p ON rp.permission_id = p.permission_id
    GROUP BY r.rooli_id, r.roolin_nimi ORDER BY r.rooli_id;
`;

// 2. SELECT_ALL_PERMISSIONS
export const SELECT_ALL_PERMISSIONS = `
    SELECT permission_id as "permissionId", permission_name as "permissionName", description, category
    FROM public.permissions ORDER BY permission_name;
`;

// 3. DELETE_PERMISSIONS_FOR_ROLE
export const DELETE_PERMISSIONS_FOR_ROLE = `DELETE FROM public.role_permissions WHERE rooli_id = $1;`;

// 4. INSERT_PERMISSION_FOR_ROLE
export const INSERT_PERMISSION_FOR_ROLE = `
    INSERT INTO public.role_permissions (rooli_id, permission_id)
    VALUES ($1, $2) ON CONFLICT DO NOTHING;
`;