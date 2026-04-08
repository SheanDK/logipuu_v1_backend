// backend/src/types/user.types.ts

//1. This interface is API response for /api/user endpoint.
export interface IUserAdminView {
    username: string;
    fullName: string;
    userLevel: number;
    isActive: boolean;
    driverNumericId: number | null;
    roles: string[];
    roleIds?: number[];
}

//2. This interface is API response for /api/user endpoint.
export interface UserProfileResponseDto {
    username: string;
    fullName: string;
    roles: string[];
    driverEmail: string | null;
    currentVehicleId?: number | null;
    currentVehicleRegNo?: string | null;
}


