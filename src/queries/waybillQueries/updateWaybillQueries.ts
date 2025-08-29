// backend/src/queries/waybillQueries/updateWaybillQueries.ts
export const UPDATE_WAYBILL_BY_ID = `
    UPDATE public.rahtikirja
    SET
        pvm = $1, kuorma_id = $2, rahtikirjan_nro = $3, reitti = $4, m3 = $5,
        m3_hinta = $6, km = $7, km_hinta = $8, kpl = $9, kpl_hinta = $10,
        jako = $11, jako_hinta = $12, tievero = $13, koko_hinta = $14, lisatiedot = $15
    WHERE rahti_id = $16
    RETURNING rahti_id;
`;