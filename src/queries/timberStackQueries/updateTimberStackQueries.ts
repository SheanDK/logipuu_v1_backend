// backend/src/queries/timberStackQueries/updateTimberStackQueries.ts

export const UPDATE_TIMBER_STACK_BY_ID = `
    UPDATE public.puulaani
    SET
        asiakas_id = $1, pvm = $2, nimi = $3, auto_nro = $4,
        lisatiedot = $5, kok = $6, jaljella = $7, km = $8,
        aktiivinen = $9, valmis = $10, sijainti_lat = $11,
        sijainti_long = $12, ajomaaraysnro = $13
    WHERE puulaani_id = $14
    RETURNING puulaani_id;
`;

// --- NEW QUERIES FOR FULL UPDATE ---

export const DELETE_AUTOT_BY_PUULAANI_ID = `
    DELETE FROM public.autot WHERE puulaani_id = $1;
`;

export const INSERT_AUTOT_FOR_PUULAANI = `
    INSERT INTO public.autot (puulaani_id, kalusto_id) VALUES ($1, $2);
`;

export const DELETE_PUUTAVARALAJI_BY_PUULAANI_ID = `
    DELETE FROM public.puutavaralaji WHERE puulaani_id = $1;
`;

// export const INSERT_PUUTAVARALAJI_FOR_PUULAANI = `
//     INSERT INTO public.puutavaralaji 
//         (puulaani_id, asiakas_id, puutavara_nro, purkupaikka_id, kuutiot, haettu, jaljella, valmis) 
//     VALUES 
//         ($1, $2, $3, $4, $5, $6, $7, $8);
// `;

export const INSERT_PUUTAVARALAJI_FOR_PUULAANI = `
    INSERT INTO public.puutavaralaji 
        (puulaani_id, asiakas_id, puutavara_nro, purkupaikka_id, kuutiot, haettu, jaljella, valmis) 
    VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8);
`;

export const UPDATE_TIMBER_STACK_LOCATION = `
    UPDATE public.puulaani
    SET sijainti_lat = $1, sijainti_long = $2
    WHERE puulaani_id = $3
    RETURNING puulaani_id, sijainti_lat, sijainti_long;
`;