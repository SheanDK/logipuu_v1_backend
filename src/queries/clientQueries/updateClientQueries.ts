// backend/src/queries/clientQueries/updateClientQueries.ts

export const UPDATE_CLIENT_BY_ID = `
    UPDATE public.asiakkaat 
    SET asiakkaan_nimi = $1, osoite = $2, posti_nro = $3, 
        paikkakunta = $4, puhelin_nro = $5, ytunnus = $6, 
        kohteen_vari = $7, tyyppi = $8, aktiivinen = $9, 
        yhteyshenkilo = $10, sahkoposti = $11, lisatietoja = $12
    WHERE asiakkaan_id = $13 
    RETURNING *; -- CORRECTED: Return all columns for consistency.
`;