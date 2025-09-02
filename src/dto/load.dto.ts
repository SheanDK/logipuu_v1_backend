// backend/src/dto/load.dto.ts
import { IsInt, IsNotEmpty, IsString, MaxLength, IsNumber, IsDate, IsEnum, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LoadTypeEnum } from '../types/load.types';

export class CreateLoadDto {
    @IsEnum(LoadTypeEnum)
    @IsNotEmpty()
    tyyppi!: LoadTypeEnum;

    @IsInt() @IsNotEmpty() @Type(() => Number)
    asiakasId!: number;
    
    @IsInt() @IsNotEmpty() @Type(() => Number) // Puulaani is required for this type of load
    puulaaniId!: number;

    @IsInt() @IsNotEmpty() @Type(() => Number)
    puutavaraId!: number; // Timber task is required

    @IsInt() @IsNotEmpty() @Type(() => Number)
    kalustoNro!: number;

    @IsInt() @IsNotEmpty() @Type(() => Number)
    kuljId!: number;

    @IsDate() @IsNotEmpty() @Type(() => Date)
    pvm!: Date;

    @IsString() @IsOptional() @MaxLength(45)
    ajomaaraysNro?: string;
    
    // --- THIS IS THE FIX ---
    // Add the missing properties that the frontend sends
    @IsString() @IsOptional() @MaxLength(100)
    kohde?: string;

    @IsString() @IsOptional() @MaxLength(100)
    lahto?: string;
    // --- END OF FIX ---

    @IsNumber() @IsOptional() @Min(0) @Type(() => Number)
    m3?: number;

    @IsNumber() @IsOptional() @Min(0) @Type(() => Number)
    km?: number;
    
    @IsString() @IsOptional()
    lisatiedot?: string;
}

// --- THIS IS THE  DTO FOR STATUS UPDATES ---
export class UpdateLoadStatusDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    status!: string;
}

// Update DTO can inherit and all fields will be optional due to validation options
export class UpdateLoadDto extends CreateLoadDto {}