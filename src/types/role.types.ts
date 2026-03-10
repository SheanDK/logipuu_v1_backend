// backend/src/types/role.types.ts

//1. This interface is API response for /api/roles endpoint.
export interface IRole {
    rooliId: number;
    roolinNimi: string;
    permissionIds: number[];
}