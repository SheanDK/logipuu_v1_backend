// backend/src/types/load.types.ts

export enum LoadTypeEnum {
    PUULAANI = 0,
    POLE_TRANSPORT = 1,
}

export interface ILoad {
    kuormaId: number;
    tyyppi: LoadTypeEnum;
    asiakasId: number | null;
    puulaaniId: number | null;
    puutavaraId: number | null; 
    autoId: number | null; 
    kuljId: number | null;
    pvm: Date | null;
    pvmLaskutus: Date | null; 
    ajomaaraysNro: string | null;
    vastaanottoNro: string | null;
    kohde: string | null; 
    lahto: string | null; 
    reitti: string | null;
    m3: number;
    km: number;
    tunnit: number; 
    kpl: number; 
    lisatiedot: string | null;
    laskutukseen: number; 
    m3Hinta: number;
    kmHinta: number;
    tunnitHinta: number;
    kplHinta: number;
    kokohinta: number; 
    kalustoNro: number | null;
    isActive: boolean;
}

export interface ILoadListItem {
    kuormaId: number;
    pvm: string; 
    asiakkaanNimi: string;
    lahto: string | null; 
    kohde: string | null; 
    rekNro: string; 
    kuljettajanNimi: string; 
    tyyppi: string; 
    isActive: boolean;
}

export interface ILoadDetails {
    kuormaId: number;
    pvm: Date;
    ajomaaraysNro: string | null;
    status: string;
    lisatiedot: string | null; 
    kuljId: number;
    asiakkaanNimi: string;
    rekNro: string;
    kuljettajanNimi: string;
    originName: string;
    originAddress: string | null; 
    originLat: number | null;
    originLng: number | null;
    originInstructions: string | null; 
    taskTimberTypeName: string;
    taskVolume: number; 
    taskRemainingVolumeBeforeThisTrip: number; 
    destinationName: string;
    destinationAddress: string | null; 
    destinationLat: number | null;
    destinationLng: number | null;
}

export interface IMapTrip {
    tripId: number;
    driverName: string;
    vehicleRegNo: string;
    originName: string;
    destinationName: string;
    status: string;
    originCoords: { lat: number, lng: number };
    destinationCoords: { lat: number, lng: number };
}

// --- UPDATED ITripDetails ---
export interface ITripDetails {
    tripId: string | null;
    ajomaaraysNro: string | null;
    vastaanottoNro?: string | null; 
    asiakasId: number;
    asiakkaanNimi: string;
    rekNro: string;
    kalustoNro: number | null;
    kuljettajanNimi: string;
    
    // Added these optional fields to support direct display in modal
    lahto?: string | null;
    kohde?: string | null;
    m3?: number;
    km?: number;
    tyyppi?: string | number;
    pvm?: Date | string;
    lisatiedot?: string | null;
    status?: string;
    tunnit?: number; 
    kpl?: number;
    // Optional Waybills for Consignment
    rahtikirjat?: any[];

    legs: {
        kuormaId: number;
        pvm: Date;
        status: string;
        m3: number;
        km: number;
        tunnit: number;
        kpl: number;
        reitti: string | null;
        vastaanottoNro: string | null;
        kuljId: number | null;
        puulaaniId: number | null;
        puutavaraId: number | null;
        lisatiedot: string | null;
        originName: string;
        destinationName: string;
        originLat: number | null;
        originLng: number | null;
        destinationLat: number | null;
        destinationLng: number | null;
        taskTimberTypeName: string;
    }[];
}

export interface IOtherTripOnMap {
    kuormaId: number;
    originName: string;
    originCoords: { lat: number, lng: number };
}

export interface ITripDetailsPageData {
    mainTrip: ITripDetails;
    otherActiveTrips: IOtherTripOnMap[];
}

export interface ITripLeg {
    kuormaId: number;
    pvm: Date;
    status: string;
    m3: number;
    kuljId: number | null;
    puulaaniId: number | null;
    puutavaraId: number | null;
    lisatiedot: string | null;
    originName: string;
    destinationName: string;
    originLat: number | null;
    originLng: number | null;
    destinationLat: number | null;
    destinationLng: number | null;
    taskTimberTypeName: string;
}