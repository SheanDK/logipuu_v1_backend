// backend/src/queries/loadQueries/updateLoadQueries.ts

// This query targets the 'kuorma' table now. It will update the specific load.
export const UPDATE_DRIVEN_INSPECTION_ROW = `
    UPDATE public.kuorma
    SET
        pvm = $1,
        vastaanotto_nro = $2,
        reitti = $3,
        m3 = $4,
        km = $5,
        tunnit = $6,
        kpl = $7,
        lisatiedot = $8
    WHERE kuorma_id = $9 -- <<< NOTE: Parameter count is now 9
    RETURNING *;
`;

// Accept logic now has two parts. This updates the 'kuorma' table.
export const ACCEPT_KUORMA_ENTRIES_FOR_BILLING = `
    UPDATE public.kuorma
    SET laskutukseen = 1
    WHERE puutavara_id = ANY($1::int[]) AND laskutukseen = 0
    RETURNING kuorma_id;
`;

// This query marks the timber stack item as completed.
export const MARK_PUUTAVARALAJI_AS_COMPLETE = `
    UPDATE public.puutavaralaji
    SET valmis = TRUE
    WHERE puutavara_id = ANY($1::int[])
    RETURNING puutavara_id;
`;

export const INSERT_NEW_KUORMA_FROM_PTL = `
    INSERT INTO public.kuorma (
        puutavara_id, asiakas_id, puulaani_id, pvm, ajomaarays_nro, auto_id, kalusto_nro,
        vastaanotto_nro, reitti, m3, km, tunnit, kpl, lisatiedot, laskutukseen, tyyppi
    )
    SELECT
        ptl.puutavara_id,
        p.asiakas_id,
        ptl.puulaani_id,
        CURRENT_DATE, -- Use current date as default
        p.ajomaaraysnro,
        (SELECT a.auto_id FROM public.autot a JOIN public.kalusto k ON a.kalusto_id = k.kalusto_nro WHERE k.rek_nro = p.auto_nro LIMIT 1), -- Attempt to find auto_id
        (SELECT k.kalusto_nro FROM public.kalusto k WHERE k.rek_nro = p.auto_nro LIMIT 1), -- Attempt to find kalusto_nro
        $2, $3, $4, $5, $6, $7, $8,
        0, -- Default 'laskutukseen' to 0 (Not ready for billing)
        0  -- Default 'tyyppi' to 0 (Puulaani)
    FROM 
        public.puutavaralaji ptl
    JOIN
        public.puulaani p ON ptl.puulaani_id = p.puulaani_id
    WHERE 
        ptl.puutavara_id = $1
    RETURNING *;
`;