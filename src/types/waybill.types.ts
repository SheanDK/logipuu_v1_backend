// backend/src/types/waybill.types.ts

export interface IWaybill {
    rahtiId: number; // Primary key
    pvm: Date; // Date
    kuormaId: number; // Foreign key to kuorma (Load)
    rahtikirjanNro: string | null; // Consignment Note No.
    reitti: string | null; // Route
    m3: number; // Volume
    m3Hinta: number; // Price per m3
    km: number; // Kilometers
    kmHinta: number; // Price per km
    kpl: number; // Pieces
    kplHinta: number; // Price per piece
    jako: number; // Distribution
    jakoHinta: number; // Distribution price
    tievero: number; // Road tax
    kokoHinta: number; // Total price
    lisatiedot: string | null; // Additional info
}