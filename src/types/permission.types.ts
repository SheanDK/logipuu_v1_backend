// backend/src/types/permission.types.ts

//1. This interface is API response for /api/permissions endpoint.
export interface IPermission {
    permissionId: number;
    permissionName: string;
    description: string | null;
    category: string;
}