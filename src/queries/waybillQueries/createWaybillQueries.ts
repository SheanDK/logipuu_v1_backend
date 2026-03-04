// backend/src/queries/waybillQueries/createWaybillQueries.ts

// 1. INSERT_WAYBILL
export const INSERT_WAYBILL = `
    INSERT INTO public.rahtikirja (
        pvm, kuorma_id, rahtikirjan_nro, reitti, m3, m3_hinta, km, km_hinta,
        kpl, kpl_hinta, jako, jako_hinta, tievero, koko_hinta, lisatiedot
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    RETURNING rahti_id;
`;