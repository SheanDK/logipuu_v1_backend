// backend/src/dto/location.dto.ts
import { IsNotEmpty, IsString, IsLatitude, IsLongitude, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateLocationDto {
    @IsString() // Or IsNumber, depending on how vehicleId is represented
    @IsNotEmpty()
    vehicleId!: string; // This could be KalustoNro (vehicleNo) or RekNro (registrationNo)

    @IsLatitude()
    @IsNotEmpty()
    latitude!: string; // Frontend might send as string

    @IsLongitude()
    @IsNotEmpty()
    longitude!: string; // Frontend might send as string

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    timestamp?: number; // Optional: Timestamp of the location update
}