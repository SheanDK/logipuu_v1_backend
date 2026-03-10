// backend/src/types/client.types.ts

//1. Define the enum here so it can be used across typess and services
export enum ClientTypeEnum {
    PUULAANI = 0,
    RAHTIKIRJA = 1,
    BOTH = 2,
}

//2. This interface should match what your API sends to the frontend.
export interface IClient {
    clientId: string;
    clientName: string;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    phoneNo: string | null;
    vatId: string | null;
    targetColor: string | null;
    type: ClientTypeEnum;
    isActive: boolean;
    contactPerson: string | null;
    email: string | null;
    additionalInfo: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}