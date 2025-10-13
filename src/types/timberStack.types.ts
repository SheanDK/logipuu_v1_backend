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
    timberTypeId?: string;  
}

export interface IPuulaaniFullDetails {
    puulaani: any;      // We keep this flexible for now
    autot: number[];    // This MUST be an array of numbers
    timberEntries: any[]; // THIS IS THE FIX: Ensure this property exists
    relatedLoads: any[];  // This property should also exist
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
        valmis: boolean;
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