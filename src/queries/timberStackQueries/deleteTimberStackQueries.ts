// backend/src/queries/timberStackQueries/deleteTimberStackQueries.ts
export const DELETE_TIMBER_STACK_BY_ID = `DELETE FROM public.puulaani WHERE puulaani_id = $1 RETURNING puulaani_id;`;

// --- NEW QUERIES FOR FULL UPDATE ---

// Deletes all wood entries for a given puulaani that are NOT in the provided list of IDs to keep
export const DELETE_OLD_PUUTAVARALAJI_ENTRIES = `
    DELETE FROM public.puutavaralaji
    WHERE puulaani_id = $1 AND puutavara_id NOT IN (SELECT unnest($2::integer[]));
`;

// Deletes all vehicle associations for a given puulaani
export const DELETE_ALL_PUULAANI_AUTO_MAPPINGS = `
    DELETE FROM public.autot WHERE puulaani_id = $1;
`;

// Deletes all vehicle associations for a given puulaani_id
export const DELETE_VEHICLE_ASSOCIATIONS_BY_STACK_ID = `
    DELETE FROM public.autot WHERE puulaani_id = $1;
`;

export const DELETE_WOOD_ENTRIES_BY_STACK_ID = `
    DELETE FROM public.puutavaralaji WHERE puulaani_id = $1;
`;

