// backend/src/queries/clientQueries/createClientQueries.ts

// 1. INSERT_CLIENT
export const INSERT_CLIENT = `
    INSERT INTO public.asiakkaat (
        asiakkaan_nimi, osoite, posti_nro, paikkakunta, 
        puhelin_nro, ytunnus, kohteen_vari, tyyppi, 
        aktiivinen, yhteyshenkilo, sahkoposti, lisatietoja
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
`;