// backend/src/dto/location.dto.ts
import { IsNotEmpty, IsString, IsLatitude, IsLongitude, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

// 1. --- UPDATE LOCATION DTO ---
export class UpdateLocationDto {
    @IsString()
    @IsNotEmpty()
    vehicleId!: string;

    @IsLatitude()
    @IsNotEmpty()
    latitude!: string;

    @IsLongitude()
    @IsNotEmpty()
    longitude!: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    timestamp?: number;
}