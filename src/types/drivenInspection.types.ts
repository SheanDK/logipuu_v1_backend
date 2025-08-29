// backend/src/types/drivenInspection.types.ts


// Represents a single row in the Driven/Inspection DataGrid
export interface IDrivenInspectionListItem {
    kuormaId: number | null;
    puutavaraId: number; // Swapped order for clarity
    date: string;
    drivingOrderNo: string | null;
    receptionNo: string | null;
    autoNro: string | null;
    driverName: string | null;
    puulaaniName: string | null;
    customerName: string | null;
    timberTypes: string | null;
    unloadingSiteName: string | null; // Keep this for now, can be removed if not needed
    drivingRoute: string | null; // <<< ADD
    cubicMeters: number | null;
    freightKm: number | null;
    hours: number | null; // <<< ADD
    pcs: number | null; // <<< ADD
    additionalInformation: string | null;
    accepted: boolean; // This comes from puutavaralaji.valmis
}

export interface IDrivenInspectionFilters {
    startDate?: string; // Expecting 'YYYY-MM-DD' format
    endDate?: string;
    customerId?: string;
    vehicleId?: string;
    timberGradeIds?: number[];
}
// DTO for updating a single row from the editable grid
export interface IUpdateDrivenInspectionRowDto {
    date?: string;
    receptionNo?: string;
    drivingRoute?: string;
    cubicMeters?: number;
    freightKm?: number;
    hours?: number;
    pcs?: number;
    additionalInfo?: string;
}

// DTO for the "Accept" action, receives an array of kuorma_id's
export interface IAcceptEntriesDto {
    puutavaraIds: number[];
}

export interface ICreateKuormaFromPtlDto {
    puutavaraId: number; // To link the new kuorma record
    receptionNo?: string | null;
    drivingRoute?: string | null;
    cubicMeters?: number | null;
    freightKm?: number | null;
    hours?: number | null;
    pcs?: number | null;
    additionalInfo?: string | null;
}