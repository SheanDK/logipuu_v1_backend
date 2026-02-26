// backend/src/types/chipTransportTypes.ts

export type ChipLoadStatus = 'NOT_SENT' | 'DISPATCHED' | 'LOADED' | 'COMPLETED';

export interface ChipTitle {
    title_id?: number;
    title_number: string;
    customer_id: number;
    loading_point_id: number;
    unloading_point_id: number;
    product_number: number;
    title_name: string;
    abbreviation?: string;
    invoicing_basis: 'Tons' | 'M3' | 'Pcs';
    driver_instructions?: string;
    req_pcs: boolean;
    req_m3: boolean;
    req_ton: boolean;
    req_hr: boolean;
    req_waiting: boolean;
    req_km: boolean;
    req_details: boolean;
    req_details_info?: string;
    is_active: boolean;
}

export interface ChipLoad {
    load_id?: number;
    title_id: number;
    vehicle_number: number;
    order_id?: number;
    scheduled_date: string;
    serial_no: number;
    status: ChipLoadStatus;
    actual_ton?: number;
    actual_m3?: number;
    actual_pcs?: number;
    actual_hr?: number;
    actual_km?: number;
    actual_waiting?: number;
    actual_details?: string;
}