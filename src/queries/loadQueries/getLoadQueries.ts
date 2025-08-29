// backend/src/queries/loadQueries.ts

export const SELECT_ALL_LOADS_FOR_LIST = `
    SELECT
        k.kuorma_id,
        TO_CHAR(k.pvm, 'YYYY-MM-DD') AS pvm,
        a.asiakkaan_nimi,
        COALESCE(p.nimi, k.lahto, 'N/A') AS lahto,
        COALESCE(pp.purkupaikka, k.kohde, 'N/A') AS kohde,
        kal.rek_nro,
        kul.nimi AS kuljettajan_nimi,
        CASE
            WHEN k.tyyppi = 0 THEN 'Puulaani'
            WHEN k.tyyppi = 1 THEN 'Pole Transport'
            ELSE 'Unknown'
        END AS tyyppi,
        k.is_active
    FROM
        public.kuorma k
    LEFT JOIN
        public.asiakkaat a ON k.asiakas_id = a.asiakkaan_id
    LEFT JOIN
        public.puulaani p ON k.puulaani_id = p.puulaani_id
    LEFT JOIN 
        public.kalusto kal ON k.kalusto_nro = kal.kalusto_nro
    LEFT JOIN
        public.kuljettajat kul ON k.kulj_id = kul.kulj_id
    LEFT JOIN 
        public.purkupaikka pp ON k.kohde = pp.purkupaikka
    -- --- THIS IS THE FIX ---
    WHERE 
        k.is_active = TRUE
    ORDER BY
        k.pvm DESC, k.kuorma_id DESC;
`;