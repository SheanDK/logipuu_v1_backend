// backend/src/types/unloadingSite.types.ts
//1. This interface is API response for /api/unloadingSite endpoint.
export interface IUnloadingSite {
    purkupaikkaId: number;
    asiakasId: number;
    purkupaikka: string;
    sijaintiLat: number | null;
    sijaintiLong: number | null;
    isVisibleOnMap: boolean;
    isActive: boolean;
    clientName?: string;
    clientColor?: string;
}