// backend/src/queries/clientQueries/deleteClientQueries.ts

export const DELETE_CLIENT_BY_ID = `
    DELETE FROM public.asiakkaat 
    WHERE asiakkaan_id = $1 
    RETURNING asiakkaan_id; -- CORRECTED: Return the original column name.
`;