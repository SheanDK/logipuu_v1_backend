// backend/src/types/timberStack.types.ts

//1. This interface is API response for /api/timberStack endpoint.
export interface ITimberStack {
    puulaaniId: number;
    asiakasId: number;
    pvm: Date;
    nimi: string;
    autoNro: string | null;
    lisatiedot: string | null;
    kok: number;
    jaljella: number;
    km: number | null;
    aktiivinen: boolean;
    valmis: boolean;
    sijaintiLat: number | null;
    sijaintiLong: number | null;
    ajomaaraysnro: string | null;
    clientName?: string;
    clientColor?: string;
}

//2. This interface is API response for /api/timberStack endpoint.
export interface IPuutavaraItem {
    puutavaraNro: number;
    puutavara: string;
}

//3. This interface is API response for /api/timberStack endpoint.
export interface ITimberStackFilters {
    vehicleId: any;
    clientId?: string;
    status?: 'all' | 'active';
    timberTypeId?: string;
}

//4. This interface is API response for /api/timberStack endpoint.
export interface IPuulaaniFullDetails {
    puulaani: any;
    autot: number[];
    timberEntries: any[];
    relatedLoads: any[];
}

//5. This interface is API response for /api/timberStack endpoint.
export interface IUpdateTimberStackFullDto {
    puulaani: {
        nimi: string;
        pvm: Date;
        asiakasId: number;
        ajomaaraysnro: string | null;
        aktiivinen: boolean;
        valmis: boolean;
        lisatiedot: string | null;
        autoNro: string | null;
        km: number | null;
        sijaintiLat: number | null;
        sijaintiLong: number | null;
    };
    autot: number[];
    puutavarat: {
        puutavara_id: number;
        puutavaranro: number;
        purkupaikka_id: number;
        kuutiot: number;
        haettu: number;
        valmis: boolean;
    }[];
}

//6. This interface is API response for /api/timberStack endpoint.
export interface ITimberStackListFilters {
    status?: 'all' | 'active' | 'completed';
    clientId?: string;
    vehicleId?: string;
    timberTypeId?: string;
}

//7. This interface is API response for /api/timberStack endpoint.
export interface ITimberStackListItem {
    puulaaniId: number;
    nimi: string;
    asiakkaanNimi: string;
    pvm: string;
    kok: number;
    jaljella: number;
}