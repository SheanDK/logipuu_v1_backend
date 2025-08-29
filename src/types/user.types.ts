// backend/src/types/user.types.ts

// --- DTOs are REMOVED from this file. Only use interfaces for data shapes. ---

/**
 * Represents the data structure for a user's profile as viewed by an admin.
 * This is used for displaying user lists in the admin panel.
 */
export interface IUserAdminView {
    username: string;
    fullName: string;
    userLevel: number;
    isActive: boolean;
    driverNumericId: number | null;
    roles: string[];
    roleIds?: number[]; // Optional, as it's only added for edit mode.
}

/**
 * Represents the detailed user profile structure returned by the /users/me/profile endpoint.
 * This is a Data Transfer Object (DTO) for responses, but since it doesn't have validation,
 * it's acceptable to keep it here as an interface.
 */
export interface UserProfileResponseDto {
    username: string;
    fullName: string;
    roles: string[];
    driverEmail: string | null;
}


// --- IMPORTANT ---
// Ensure there are NO other exports named 'ChangePasswordDto' in this file.
// If you have `export * from '../dto/user.dto';` in this file, REMOVE IT.