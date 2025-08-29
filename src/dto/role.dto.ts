// backend/src/dto/role.dto.ts
import { IsArray, IsNumber } from 'class-validator';

// DTO for updating permissions for a role
export class UpdateRolePermissionsDto {
    @IsArray()
    @IsNumber({}, { each: true }) // Validate that each item in the array is a number
    permissionIds!: number[];
}