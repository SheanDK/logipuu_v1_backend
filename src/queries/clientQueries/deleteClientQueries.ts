// backend/src/queries/clientQueries/deleteClientQueries.ts

// 1. DELETE_CLIENT_BY_ID
export const DELETE_CLIENT_BY_ID = `
    DELETE FROM public.asiakkaat 
    WHERE asiakkaan_id = $1 
    RETURNING asiakkaan_id;
`;