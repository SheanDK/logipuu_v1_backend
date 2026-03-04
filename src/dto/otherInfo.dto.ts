// backend/src/dto/otherInfo.dto.ts
import { IsInt, IsNotEmpty, IsString, MaxLength, IsNumber, IsLatitude, IsLongitude, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OtherInfoTypeEnum } from '../types/otherInfo.types';

// 1. --- CREATE OTHER INFO DTO ---
export class CreateOtherInfoDto {
    @IsEnum(OtherInfoTypeEnum) @IsNotEmpty()
    type!: OtherInfoTypeEnum;

    @IsString() @IsOptional() @MaxLength(255)
    details?: string | null;

    @IsNumber() @IsNotEmpty() @IsLatitude() @Type(() => Number)
    latitude!: number;

    @IsNumber() @IsNotEmpty() @IsLongitude() @Type(() => Number)
    longitude!: number;
}

// 2. --- UPDATE OTHER INFO DTO ---
export class UpdateOtherInfoDto {
    @IsEnum(OtherInfoTypeEnum) @IsOptional()
    type?: OtherInfoTypeEnum;

    @IsString() @IsOptional() @MaxLength(255)
    details?: string | null;

    @IsNumber() @IsOptional() @IsLatitude() @Type(() => Number)
    latitude?: number;

    @IsNumber() @IsOptional() @IsLongitude() @Type(() => Number)
    longitude?: number;
}