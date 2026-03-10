import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
// import { Transform } from 'class-transformer'; // Not used in this DTO, but could be for date parsing if needed

// 1. --- CREATE VEHICLE DTO ---
export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(15)
    registrationNo!: string;

    @IsDateString()
    @IsNotEmpty()
    previousInspectionDate!: string;

    @IsDateString()
    @IsNotEmpty()
    nextInspectionDate!: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;
}

// 2. --- UPDATE VEHICLE DTO ---
export class UpdateVehicleDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(15)
    registrationNo?: string;

    @IsDateString()
    @IsOptional()
    previousInspectionDate?: string;

    @IsDateString()
    @IsOptional()
    nextInspectionDate?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}