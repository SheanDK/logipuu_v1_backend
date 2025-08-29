// backend/src/types/unloadingSite.types.ts

export interface IUnloadingSite {
    purkupaikkaId: number;
    asiakasId: number;
    purkupaikka: string;
    sijaintiLat: number | null; // Keep as nullable
    sijaintiLong: number | null; // Keep as nullable
    isVisibleOnMap: boolean; // From previous step
    
    // --- ADD THIS NEW PROPERTY ---
    isActive: boolean; // For soft-deleting

    clientName?: string;
    clientColor?: string;
}