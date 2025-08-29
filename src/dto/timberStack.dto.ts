// backend/src/dto/timberStack.dto.ts
import {
    IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional,
    IsNumber, Min, MaxLength, IsLatitude, IsLongitude, IsInt,
    IsArray, ValidateNested // <<<--- CORRECTION 1: Import the missing decorators
} from 'class-validator';
import { Type } from 'class-transformer';

// A small DTO for a single wood entry within the main DTO
// This needs to be defined before it is used in CreateTimberStackDto
class WoodEntryDto {
    @IsInt()
    @IsNotEmpty()
    woodTypeId!: number;

    @IsInt()
    @IsNotEmpty()
    dropoffLocationId!: number;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @IsNotEmpty()
    @Type(() => Number)
    totalVolume!: number;
}

export class CreateTimberStackDto {
    @IsInt() @IsNotEmpty() @Type(() => Number)
    clientId!: number;

    @IsDateString() @IsNotEmpty()
    date!: string;

    @IsString() @IsNotEmpty() @MaxLength(200)
    name!: string;
    
    @IsString() @IsOptional() @MaxLength(500)
    auto_nro?: string | null;

    @IsString() @IsOptional()
    additionalInfo?: string | null;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsNotEmpty()
    @Type(() => Number)
    totalVolume!: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    remainingVolume?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kilometers?: number | null;

    @IsBoolean() @IsOptional()
    isActive?: boolean;

    @IsBoolean() @IsOptional()
    isCompleted?: boolean;

    @IsNumber() @IsNotEmpty() @IsLatitude()
    latitude!: number;

    @IsNumber() @IsNotEmpty() @IsLongitude()
    longitude!: number;
    
    @IsString() @IsOptional() @MaxLength(45)
    dispatchOrderNo?: string | null;

    @IsArray()
    @IsOptional()
    @IsInt({ each: true })
    selectedAutoIds?: number[];

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => WoodEntryDto)
    woodEntries?: WoodEntryDto[];

    @IsString()
    @IsOptional()
    @MaxLength(50)
    markerStyle?: string;
}

// Ensure the Update DTO also uses the same consistent names
export class UpdateTimberStackDto {
    @IsInt() @IsOptional() @Type(() => Number)
    clientId?: number;

    @IsDateString() @IsOptional()
    date?: string;

    @IsString() @IsOptional() @MaxLength(200)
    name?: string;
    
    @IsString() @IsOptional() @MaxLength(500)
    vehicleNumbers?: string;

    @IsString() @IsOptional()
    additionalInfo?: string;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    totalVolume?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    remainingVolume?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kilometers?: number;

    @IsBoolean() @IsOptional()
    isActive?: boolean;

    @IsBoolean() @IsOptional()
    isCompleted?: boolean;

    @IsNumber() @IsOptional() @IsLatitude() @Type(() => Number)
    latitude?: number;

    @IsNumber() @IsOptional() @IsLongitude() @Type(() => Number)
    longitude?: number;
    
    @IsString() @IsOptional() @MaxLength(45)
    consignmentNoteNo?: string;
}

// --- DTO for location updates ---
export class UpdateTimberStackLocationDto {
    @IsLatitude()
    @IsNotEmpty()
    latitude!: number;

    @IsLongitude()
    @IsNotEmpty()
    longitude!: number;
}