//backend/src/types/chipTransportTypes.ts

export type ChipLoadStatus = 'NOT_SENT' | 'DISPATCHED' | 'LOADED' | 'COMPLETED';

export interface ChipOrder {
    order_id?: number;
    asiakas_id: number;
    pvm_alku: string; // Date string (YYYY-MM-DD)
    pvm_loppu: string;
    kuormia_tavoite: number;
    tuote_tyyppi?: string;
    lisatiedot?: string;
    is_active?: boolean;
}

export interface WeeklyProgram {
    program_id?: number;
    kalusto_nro: number;
    kulj_id: number;
    viikko_nro: number;
    vuosi: number;
    created_at?: Date;
}

export interface ChipLoad {
    load_id?: number;
    program_id: number;
    order_id: number;
    pvm: string; // Date
    status: ChipLoadStatus;
    lahto_paikka: number; // puulaani_id
    purku_paikka: number; // purkupaikka_id
    planned_m3: number;
    actual_m3?: number;
    completion_timestamp?: Date;
}