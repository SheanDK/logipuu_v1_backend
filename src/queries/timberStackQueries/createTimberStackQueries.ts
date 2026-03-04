// backend/src/queries/timberStackQueries/createTimberStackQueries.ts

// 1. INSERT_TIMBER_STACK
export const INSERT_TIMBER_STACK = `
    INSERT INTO public.puulaani (
        asiakas_id, pvm, nimi, auto_nro, lisatiedot,
        kok, jaljella, km, aktiivinen, valmis,
        sijainti_lat, sijainti_long, ajomaaraysnro
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
    )
    -- CORRECTION: Use double quotes to preserve the column name for camelcase-keys
    RETURNING "puulaani_id"; 
`;