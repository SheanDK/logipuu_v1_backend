// backend/src/queries/timberStackQueries/getTimberStackQueries.ts

// 1. SELECT_ALL_TIMBER_STACKS
export const SELECT_ALL_TIMBER_STACKS = `
    SELECT
        p.puulaani_id, p.asiakas_id, a.asiakkaan_nimi, a.kohteen_vari,
        p.pvm, p.nimi, p.auto_nro, p.lisatiedot, p.kok, p.jaljella,
        p.km, p.aktiivinen, p.valmis, p.sijainti_lat, p.sijainti_long,
        p.ajomaaraysnro, p.marker_style
    FROM public.puulaani p
    LEFT JOIN public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
    WHERE 1=1 -- Placeholder for dynamic conditions
`;

// 2. SELECT_TIMBER_STACK_BY_ID
export const SELECT_TIMBER_STACK_BY_ID = `
    SELECT
        p.puulaani_id, p.asiakas_id, a.asiakkaan_nimi, a.kohteen_vari,
        p.pvm, p.nimi, p.auto_nro, p.lisatiedot, p.kok, p.jaljella,
        p.km, p.aktiivinen, p.valmis, p.sijainti_lat, p.sijainti_long,
        p.ajomaaraysnro, p.marker_style
    FROM public.puulaani p
    LEFT JOIN public.asiakkaat a ON p.asiakas_id = a.asiakkaan_id
    WHERE p.puulaani_id = $1;
`;

// 3. SELECT_AUTOT_BY_PUULAANI_ID
export const SELECT_AUTOT_BY_PUULAANI_ID = `
    SELECT * FROM public.autot WHERE puulaani_id = $1;
`;

// 4. SELECT_PUUTAVARAT_BY_PUULAANI_ID
export const SELECT_PUUTAVARAT_BY_PUULAANI_ID = `
    SELECT 
        pl.*, 
        pt.puutavara, 
        pp.purkupaikka
    FROM public.puutavaralaji pl
    LEFT JOIN public.puutavarat pt ON pl.puutavara_nro = pt.puutavara_nro
    LEFT JOIN public.purkupaikka pp ON pl.purkupaikka_id = pp.purkupaikka_id
    WHERE pl.puulaani_id = $1;
`;