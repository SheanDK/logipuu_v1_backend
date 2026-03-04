// backend/src/dto/otherMarker.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

// 1. --- CREATE OTHER MARKER DTO ---
export class CreateOtherMarkerDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    iconType!: string;

    @IsString()
    @IsOptional()
    additionalInfo?: string;

    @IsString()
    @IsNotEmpty()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid 6-digit hex code (e.g., #RRGGBB).' })
    color!: string;

    @IsNumber()
    @IsNotEmpty()
    latitude!: number;

    @IsNumber()
    @IsNotEmpty()
    longitude!: number;
}

// 2. --- UPDATE OTHER MARKER DTO ---
export class UpdateOtherMarkerDto {
    @IsString()
    @IsOptional()
    @MaxLength(50)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    iconType?: string;

    @IsString()
    @IsOptional()
    additionalInfo?: string;

    @IsString()
    @IsOptional()
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid 6-digit hex code (e.g., #RRGGBB).' })
    color?: string;

    @IsNumber()
    @IsOptional()
    latitude?: number;

    @IsNumber()
    @IsOptional()
    longitude?: number;
}