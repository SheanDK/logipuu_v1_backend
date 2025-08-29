// backend/src/queries/drivenInspectionQueries/getDrivenInspectionQueries.ts


export const SELECT_INSPECTION_LIST = `
SELECT
    ptl.puutavara_id,
    k.kuorma_id,
    -- FIX: Properly alias the date field to match frontend expectations
    to_char(COALESCE(k.pvm, p.pvm), 'YYYY-MM-DD') AS date,
    p.ajomaaraysnro AS driving_order_no,
    k.vastaanotto_nro AS reception_no,
    p.auto_nro AS auto_nro,
    (SELECT nimi FROM public.kuljettajat WHERE kulj_id = k.kulj_id) AS driver_name,
    p.nimi AS puulaani_name,
    cust.asiakkaan_nimi AS customer_name,
    pt.puutavara AS timber_types,
    pp.purkupaikka AS unloading_site_name,
    k.reitti AS driving_route,
    COALESCE(k.m3, ptl.haettu) AS cubic_meters,
    COALESCE(k.km, p.km) AS freight_km,
    COALESCE(k.tunnit, 0) AS hours,
    COALESCE(k.kpl, 0) AS pcs,
    ptl.valmis AS accepted,
    COALESCE(k.lisatiedot, p.lisatiedot) AS additional_information
FROM 
    public.puutavaralaji ptl
JOIN 
    public.puulaani p ON ptl.puulaani_id = p.puulaani_id
LEFT JOIN 
    public.asiakkaat cust ON p.asiakas_id = cust.asiakkaan_id
JOIN 
    public.puutavarat pt ON ptl.puutavara_nro = pt.puutavara_nro
JOIN 
    public.purkupaikka pp ON ptl.purkupaikka_id = pp.purkupaikka_id
LEFT JOIN 
    public.kuorma k ON ptl.puutavara_id = k.puutavara_id AND k.laskutukseen = 0
`;