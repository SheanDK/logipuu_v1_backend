// backend/src/types/otherInfo.types.ts
export enum OtherInfoTypeEnum {
    WARNING = 'VAROITUS',
    STACK_SLOT = 'PINOAMISPAIKKA',
    TURNAROUND = 'KÄÄNTÖPAIKKA',
    OTHER = 'MUU',
}

export interface IOtherInfo {
    muutietoId: number; // Primary Key
    tyyppi: OtherInfoTypeEnum; // Type of info (e.g., Warning, Stack Slot)
    lisatieto: string | null; // Additional details
    sijaintiLat: number; // Latitude
    sijaintiLong: number; // Longitude
}