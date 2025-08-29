// backend/src/dto/waybill.dto.ts
import { IsInt, IsNotEmpty, IsString, MaxLength, IsNumber, Min, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWaybillDto {
    @IsDateString() @IsNotEmpty()
    pvm!: string;

    @IsInt() @IsNotEmpty() @Type(() => Number)
    kuormaId!: number; // Foreign key to kuorma (Load)

    @IsString() @IsOptional() @MaxLength(45)
    rahtikirjanNro?: string | null;

    @IsString() @IsOptional() @MaxLength(100)
    reitti?: string | null;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsNotEmpty() @Type(() => Number)
    m3!: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    m3Hinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsNotEmpty() @Type(() => Number)
    km!: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kmHinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kpl?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kplHinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    jako?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    jakoHinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    tievero?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsNotEmpty() @Type(() => Number)
    kokoHinta!: number;

    @IsString() @IsOptional()
    lisatiedot?: string | null;
}

export class UpdateWaybillDto {
    @IsDateString() @IsOptional()
    pvm?: string;

    @IsInt() @IsOptional() @Type(() => Number)
    kuormaId?: number;

    @IsString() @IsOptional() @MaxLength(45)
    rahtikirjanNro?: string | null;

    @IsString() @IsOptional() @MaxLength(100)
    reitti?: string | null;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    m3?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    m3Hinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    km?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kmHinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kpl?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kplHinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    jako?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    jakoHinta?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    tievero?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kokoHinta?: number;

    @IsString() @IsOptional()
    lisatiedot?: string | null;
}