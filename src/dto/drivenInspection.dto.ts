// backend/src/dto/drivenInspection.dto.ts

import {
    IsInt, IsNotEmpty, IsOptional, IsDateString, IsString, MaxLength,
    IsNumber, Min, IsEnum, ValidateIf
} from 'class-validator';
import { Type } from 'class-transformer';

export enum LoadTypeEnum {
    TIMBER_STACK = 0, // Puulaani
    POLE = 1,         // Pylvas
}

export enum BillingStatusEnum {
    NOT_BILLED = 0,
    TO_BE_BILLED = 1,
    BILLED = 2,
}

// DTO for creating a Load (matches backend expectation)
export class CreateLoadDto {
    @IsEnum(LoadTypeEnum) @IsNotEmpty() @Type(() => Number)
    loadType!: LoadTypeEnum;

    @IsInt() @IsNotEmpty() @Type(() => Number)
    clientId!: number;

    @ValidateIf(o => o.loadType === LoadTypeEnum.TIMBER_STACK)
    @IsInt() @IsOptional() @Type(() => Number) // timberStackId can be optional if loadType is not TIMBER_STACK
    timberStackId?: number | null;

    @IsInt() @IsOptional() @Type(() => Number)
    timberTypeId?: number | null;

    @IsInt() @IsOptional() @Type(() => Number)
    assignedVehicleId?: number | null; // From autot table (AutoID)

    @IsInt() @IsOptional() @Type(() => Number)
    vehicleNo?: number | null; // Direct KalustoNro

    @IsInt() @IsNotEmpty() @Type(() => Number)
    driverId!: number;

    @IsDateString() @IsNotEmpty()
    loadDate!: string;

    @IsDateString() @IsOptional()
    billingDate?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    dispatchOrderNo?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    receptionNo?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    destination?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    origin?: string | null;

    @IsString() @IsOptional() @MaxLength(100)
    routeDescription?: string | null;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    volumeM3?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kilometers?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    hours?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pieces?: number = 0.00;

    @IsString() @IsOptional()
    additionalInfo?: string | null;

    @IsEnum(BillingStatusEnum) @IsOptional() @Type(() => Number)
    billingStatus?: BillingStatusEnum = BillingStatusEnum.NOT_BILLED;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerM3?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerKm?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerHour?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerPiece?: number = 0.00;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    totalPrice?: number = 0.00;
}

// DTO for updating a Load (matches backend expectation)
export class UpdateLoadDto {
    @IsEnum(LoadTypeEnum) @IsOptional() @Type(() => Number)
    loadType?: LoadTypeEnum;

    @IsInt() @IsOptional() @Type(() => Number)
    clientId?: number;

    @ValidateIf(o => o.loadType === LoadTypeEnum.TIMBER_STACK)
    @IsInt() @IsOptional() @Type(() => Number)
    timberStackId?: number | null;

    @IsInt() @IsOptional() @Type(() => Number)
    timberTypeId?: number | null;

    @IsInt() @IsOptional() @Type(() => Number)
    assignedVehicleId?: number | null;

    @IsInt() @IsOptional() @Type(() => Number)
    vehicleNo?: number | null;

    @IsInt() @IsOptional() @Type(() => Number)
    driverId?: number;

    @IsDateString() @IsOptional()
    loadDate?: string;

    @IsDateString() @IsOptional()
    billingDate?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    dispatchOrderNo?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    receptionNo?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    destination?: string | null;

    @IsString() @IsOptional() @MaxLength(45)
    origin?: string | null;

    @IsString() @IsOptional() @MaxLength(100)
    routeDescription?: string | null;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    volumeM3?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    kilometers?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    hours?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pieces?: number;

    @IsString() @IsOptional()
    additionalInfo?: string | null;

    @IsEnum(BillingStatusEnum) @IsOptional() @Type(() => Number)
    billingStatus?: BillingStatusEnum;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerM3?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerKm?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerHour?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    pricePerPiece?: number;

    @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() @Type(() => Number)
    totalPrice?: number;
}