// backend/src/types/waybill.types.ts

//1. This interface is API response for /api/waybill endpoint.
export interface IWaybill {
    rahtiId: number;
    pvm: Date;
    kuormaId: number;
    rahtikirjanNro: string | null;
    reitti: string | null;
    m3: number;
    m3Hinta: number;
    km: number;
    kmHinta: number;
    kpl: number;
    kplHinta: number;
    jako: number;
    jakoHinta: number;
    tievero: number;
    kokoHinta: number;
    lisatiedot: string | null;
}