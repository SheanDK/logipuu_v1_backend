// backend/src/types/load.types.ts

// Enum for Load Type (matches 'tyyppi' column in 'kuorma' table)
export enum LoadTypeEnum {
    PUULAANI = 0,
    POLE_TRANSPORT = 1, // 'Pylvas'
}

/**
 * Represents a single Load (Kuorma) record from the database.
 * Keys are in camelCase, matching what the frontend will receive.
 */
export interface ILoad {
    kuormaId: number;
    tyyppi: LoadTypeEnum;
    asiakasId: number | null;
    puulaaniId: number | null;
    puutavaraId: number | null; // This might be a specific timber entry from puutavaralaji
    autoId: number | null; // This links to the 'autot' table
    kuljId: number | null;
    pvm: Date | null;
    pvmLaskutus: Date | null; // Invoicing date
    ajomaaraysNro: string | null;
    vastaanottoNro: string | null;
    kohde: string | null; // Destination
    lahto: string | null; // Origin
    reitti: string | null;
    m3: number;
    km: number;
    tunnit: number; // Hours
    kpl: number; // Pieces
    lisatiedot: string | null;
    laskutukseen: number; // Status for invoicing
    m3Hinta: number;
    kmHinta: number;
    tunnitHinta: number;
    kplHinta: number;
    kokohinta: number; // Total price
    kalustoNro: number | null;
    isActive: boolean;
}

/**
 * Represents a Load item for the list view on the frontend.
 * This is a "flattened" version with joined data.
 */
export interface ILoadListItem {
    kuormaId: number;
    pvm: string; // Formatted as string for display
    asiakkaanNimi: string;
    lahto: string | null; // Origin (e.g., Puulaani name)
    kohde: string | null; // Destination (e.g., Unloading site name)
    rekNro: string; // Vehicle registration number
    kuljettajanNimi: string; // Driver's name
    tyyppi: string; // 'Puulaani' or 'Pole Transport'
    isActive: boolean;
}

// --- THIS IS THE NEW INTERFACE FOR THE LOAD DETAILS VIEW ---
export interface ILoadDetails {
    // Core Load Info (from 'kuorma' table)
    kuormaId: number;
    pvm: Date;
    ajomaaraysNro: string | null;
    status: string;
    lisatiedot: string | null; // Special instructions for the whole load
    kuljId: number;

    // Customer Info
    asiakkaanNimi: string;

    // Vehicle Info
    rekNro: string;

    // Driver Info
    kuljettajanNimi: string;

    // Origin (Puulaani) Info
    originName: string;
    originAddress: string | null; // We need to join to get this
    originLat: number | null;
    originLng: number | null;
    originInstructions: string | null; // lisatiedot from puulaani table

    // Timber Task Info (from puutavaralaji)
    taskTimberTypeName: string;
    taskVolume: number; // The m3 amount set by the driver/office for THIS trip
    taskRemainingVolumeBeforeThisTrip: number; // 'jaljella' from puutavaralaji

    // Destination (Purkupaikka) Info
    destinationName: string;
    destinationAddress: string | null; // We need to join to get this
    destinationLat: number | null;
    destinationLng: number | null;
}

// --- NEW interface for map trip lines ---
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

export interface ITripDetails {
    tripId: string | null;
    ajomaaraysNro: string | null; // Add the missing property
    asiakasId: number;
    asiakkaanNimi: string;
    rekNro: string;
    kalustoNro: number | null;
    kuljettajanNimi: string;
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

// A simple type for other trips on the map
export interface IOtherTripOnMap {
    kuormaId: number;
    originName: string;
    originCoords: { lat: number, lng: number };
}

// The new data structure for the Trip Details Page
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

