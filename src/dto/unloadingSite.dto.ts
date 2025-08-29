// backend/src/dto/unloadingSite.dto.ts
import { IsInt, IsNotEmpty, IsString, MaxLength, IsNumber, IsLatitude, IsLongitude, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUnloadingSiteDto {
    @IsInt() @IsNotEmpty() @Type(() => Number)
    clientId!: number;

    @IsString() @IsNotEmpty() @MaxLength(100)
    name!: string;

    // --- CHANGES START HERE ---
    @IsOptional() // Make this field optional
    @IsNumber()
    @IsLatitude()
    latitude?: number | null; // Allow the type to be number or null

    @IsOptional() // Make this field optional
    @IsNumber()
    @IsLongitude()
    longitude?: number | null; // Allow the type to be number or null
    // --- CHANGES END HERE ---
}

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