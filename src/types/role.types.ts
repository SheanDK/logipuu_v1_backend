// backend/src/types/role.types.ts

// import { IPermission } from "./permission.types"; // We don't need the full object for this service

// Represents a role with its assigned permission IDs
export interface IRole {
    rooliId: number;
    roolinNimi: string;
    permissionIds: number[]; // Expecting an array of permission IDs from the backend query
}