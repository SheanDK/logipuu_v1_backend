// backend/src/types/vehicle.types.ts

/**
 * Interface representing a Vehicle (Kalusto).
 * This should mirror your database table structure for a Vehicle
 * as returned by your queries (e.g., SELECT ... AS "propertyName").
 */
export interface IVehicle {
    vehicleNo: string; // KalustoNro (assuming it's a string, auto-increment)
    registrationNo: string; // RekNro
    previousInspectionDate: Date; // EdKatsastus (assuming Date object after transformation)
    nextInspectionDate: Date; // KatsastusAik (assuming Date object after transformation)
    isActive: boolean; // Aktiivinen
    // Add other fields if they exist in your DB table, e.g., createdAt, updatedAt
    createdAt?: Date; // Luotu
    updatedAt?: Date; // Paivitetty
}