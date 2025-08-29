// backend/src/types/timberStack.types.ts

// ... (ITimberStack, IPuutavaraItem, etc. interfaces remain here)
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

export interface IPuutavaraItem {
    puutavaraNro: number;
    puutavara: string;
}

export interface ITimberStackFilters {
    vehicleId: any;
    clientId?: string;
    status?: 'all' | 'active';
}

export interface IPuulaaniFullDetails {
    puulaani: ITimberStack;
    autot: any[]; // Define a proper type if needed
    puutavarat: any[]; // Define a proper type if needed
}

// --- CORRECTION: Define the shape for the puulaani object within the DTO ---
export interface IUpdateTimberStackFullDto {
    puulaani: {
        nimi: string;
        pvm: Date;
        asiakasId: number;
        ajomaaraysnro: string | null;
        aktiivinen: boolean;
        valmis: boolean;
        lisatiedot: string | null;
        autoNro: string | null; // Corrected to autoNro (camelCase)
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
    }[];
}

// Filters for the new List View
export interface ITimberStackListFilters {
  status?: 'all' | 'active' | 'completed';
  clientId?: string;
  vehicleId?: string;
  timberTypeId?: string;
}

// The structure of a single row in the new List View
export interface ITimberStackListItem {
  puulaaniId: number;
  nimi: string;         // Puulaani name from puulaani table
  asiakkaanNimi: string; // Customer name from asiakkaat table
  pvm: string;          // Date from puulaani table
  kok: number;          // Total size from puulaani table
  jaljella: number;     // Remaining size from puulaani table
}