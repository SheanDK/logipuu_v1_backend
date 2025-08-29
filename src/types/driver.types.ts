// backend/src/types/driver.types.ts

/**
 * Interface representing a Driver (Kuljettaja).
 * This should mirror your database table structure for a Driver
 * as returned by your queries (e.g., SELECT ... AS "propertyName").
 */
export interface IDriver {
    driverId: number; // KuljID (assuming it's a string, auto-increment)
    name: string; // Nimi
    phoneNo: string; // PuhelinNro
    email: string; // Email
    hasAlerts: boolean; // Halytys
    // Add other fields if they exist, e.g., createdAt, updatedAt
    createdAt?: Date; // Luotu
    updatedAt?: Date; // Paivitetty
}