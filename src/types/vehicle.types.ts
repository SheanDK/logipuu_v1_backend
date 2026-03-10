// backend/src/types/vehicle.types.ts

//1. This interface is API response for /api/vehicle endpoint.
export interface IVehicle {
    vehicleNo: string;
    registrationNo: string;
    previousInspectionDate: Date;
    nextInspectionDate: Date;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}