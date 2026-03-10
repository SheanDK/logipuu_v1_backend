// src/dto/load.dto.ts
import {
    IsInt,
    IsNotEmpty,
    IsString,
    MaxLength,
    IsNumber,
    IsDate,
    IsEnum,
    IsOptional,
    Min,
    IsArray,
    ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoadTypeEnum } from '../types/load.types';

// 1. --- CREATE LOAD DTO ---
export class CreateLoadDto {
    @IsEnum(LoadTypeEnum)
    @IsNotEmpty()
    tyyppi!: LoadTypeEnum;

    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    asiakasId!: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    puulaaniId?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    puutavaraId?: number;

    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    kalustoNro!: number;

    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    kuljId!: number;

    @IsDate()
    @IsNotEmpty()
    @Type(() => Date)
    pvm!: Date;

    @IsString()
    @IsOptional()
    @MaxLength(45)
    ajomaaraysNro?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    kohde?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    lahto?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    m3?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    km?: number;

    @IsString()
    @IsOptional()
    lisatiedot?: string;

    @IsString()
    @IsOptional()
    @MaxLength(45)
    vastaanottoNro?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    reitti?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    tunnit?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    kpl?: number;
}

// 2. --- UPDATE LOAD DTO ---
export class UpdateLoadDto {
    @IsEnum(LoadTypeEnum)
    @IsOptional()
    tyyppi?: LoadTypeEnum;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    asiakasId?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    puulaaniId?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    puutavaraId?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    kalustoNro?: number;

    @IsInt()
    @IsOptional()
    @Type(() => Number)
    kuljId?: number;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    pvm?: Date;

    @IsString()
    @IsOptional()
    @MaxLength(45)
    ajomaaraysNro?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    kohde?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    lahto?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    m3?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    km?: number;

    @IsString()
    @IsOptional()
    lisatiedot?: string;

    @IsString()
    @IsOptional()
    @MaxLength(45)
    vastaanottoNro?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    reitti?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    tunnit?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    kpl?: number;

    @IsArray()
    @IsOptional()
    rahtikirjat?: any[];
}

// 3. --- UPDATE LOAD STATUS DTO ---
export class UpdateLoadStatusDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    status!: string;
}

// 4. --- COMPLETE LOAD DTO ---
export class CompleteLoadDto {
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    @Type(() => Number)
    actualM3!: number;
    @IsNumber()
    @IsNotEmpty()
    @Min(0)
    @Type(() => Number)
    actualKm!: number;
}

// 5. --- ACCEPT LOADS DTO ---
export class AcceptLoadsDto {
    @IsArray()
    @IsNotEmpty()
    @IsInt({ each: true })
    @Type(() => Number)
    loadIds!: number[];
}

// 6. --- CREATE BULK LOAD DTO ---
export class CreateBulkLoadDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLoadDto)
    @IsNotEmpty()
    legs!: CreateLoadDto[];
}