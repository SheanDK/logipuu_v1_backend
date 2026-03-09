// backend/src/types/load.types.ts

//1. This enum is API response for /api/loadType endpoint.
export enum LoadTypeEnum {
    PUULAANI = 0,
    POLE_TRANSPORT = 1,
}

//2. This interface is API response for /api/loads endpoint.
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

//3. This interface is API response for /api/loads endpoint.
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

//4. This interface is API response for /api/loads/:id endpoint.
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

//5. This interface is API response for /api/trips endpoint.
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

//6. This interface is API response for /api/trips/:id endpoint.
export interface ITripDetails {
    tripId: string | null;
    ajomaaraysNro: string | null;
    vastaanottoNro?: string | null;
    asiakasId: number;
    asiakkaanNimi: string;
    rekNro: string;
    kalustoNro: number | null;
    kuljettajanNimi: string;
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

//7. This interface is API response for /api/trips/:id endpoint.
export interface IOtherTripOnMap {
    kuormaId: number;
    originName: string;
    originCoords: { lat: number, lng: number };
}

//8. This interface is API response for /api/trips/:id endpoint.
export interface ITripDetailsPageData {
    mainTrip: ITripDetails;
    otherActiveTrips: IOtherTripOnMap[];
}

//9. This interface is API response for /api/trips/:id endpoint.
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