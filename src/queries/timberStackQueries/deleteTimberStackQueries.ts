// backend/src/queries/timberStackQueries/deleteTimberStackQueries.ts

// 1. DELETE_TIMBER_STACK_BY_ID
export const DELETE_TIMBER_STACK_BY_ID = `DELETE FROM public.puulaani WHERE puulaani_id = $1 RETURNING puulaani_id;`;

// 2. DELETE_OLD_PUUTAVARALAJI_ENTRIES
export const DELETE_OLD_PUUTAVARALAJI_ENTRIES = `
    DELETE FROM public.puutavaralaji
    WHERE puulaani_id = $1 AND puutavara_id NOT IN (SELECT unnest($2::integer[]));
`;

// 3. DELETE_ALL_PUULAANI_AUTO_MAPPINGS
export const DELETE_ALL_PUULAANI_AUTO_MAPPINGS = `
    DELETE FROM public.autot WHERE puulaani_id = $1;
`;

// 4. DELETE_VEHICLE_ASSOCIATIONS_BY_STACK_ID
export const DELETE_VEHICLE_ASSOCIATIONS_BY_STACK_ID = `
    DELETE FROM public.autot WHERE puulaani_id = $1;
`;

// 5. DELETE_WOOD_ENTRIES_BY_STACK_ID
export const DELETE_WOOD_ENTRIES_BY_STACK_ID = `
    DELETE FROM public.puutavaralaji WHERE puulaani_id = $1;
`;

