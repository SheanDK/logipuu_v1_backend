// backend/src/types/driver.types.ts

//1. Interface is API response for /api/driver endpoint.
export interface IDriver {
    driverId: number;
    name: string;
    phoneNo: string;
    email: string;
    hasAlerts: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}