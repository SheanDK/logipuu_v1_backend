// backend/src/dto/unloadingSite.dto.ts
import { IsInt, IsNotEmpty, IsString, MaxLength, IsNumber, IsLatitude, IsLongitude, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// 1. --- CREATE UNLOADING SITE DTO ---
export class CreateUnloadingSiteDto {
    @IsInt() @IsNotEmpty() @Type(() => Number)
    clientId!: number;

    @IsString() @IsNotEmpty() @MaxLength(100)
    name!: string;

    @IsOptional()
    @IsNumber()
    @IsLatitude()
    latitude?: number | null;

    @IsOptional()
    @IsNumber()
    @IsLongitude()
    longitude?: number | null;
}

// 2. --- UPDATE UNLOADING SITE DTO ---
export class UpdateUnloadingSiteDto {
    @IsInt() @IsOptional() @Type(() => Number)
    clientId?: number;

    @IsString() @IsOptional() @MaxLength(100)
    name?: string;

    @IsNumber() @IsOptional() @IsLatitude()
    latitude?: number;

    @IsNumber() @IsOptional() @IsLongitude()
    longitude?: number;
}

export class UpdateUnloadingSiteVisibilityDto {
    @IsBoolean()
    @IsNotEmpty()
    isVisible!: boolean;
}