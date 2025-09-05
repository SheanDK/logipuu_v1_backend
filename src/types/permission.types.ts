// backend/src/types/permission.types.ts
export interface IPermission {
    permissionId: number;
    permissionName: string;
    description: string | null;
    category: string;
}