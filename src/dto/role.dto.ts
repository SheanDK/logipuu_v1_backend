// backend/src/dto/role.dto.ts
import { IsArray, IsNumber } from 'class-validator';

// 1. --- UPDATE ROLE PERMISSIONS DTO ---
export class UpdateRolePermissionsDto {
    @IsArray()
    @IsNumber({}, { each: true })
    permissionIds!: number[];
}