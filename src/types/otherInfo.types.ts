// backend/src/types/otherInfo.types.ts

//1. This enum is API response for /api/otherInfo endpoint.
export enum OtherInfoTypeEnum {
    WARNING = 'VAROITUS',
    STACK_SLOT = 'PINOAMISPAIKKA',
    TURNAROUND = 'KÄÄNTÖPAIKKA',
    OTHER = 'MUU',
}

//2. This interface is API response for /api/otherInfo endpoint.
export interface IOtherInfo {
    muutietoId: number;
    tyyppi: OtherInfoTypeEnum;
    lisatieto: string | null;
    sijaintiLat: number;
    sijaintiLong: number;
}