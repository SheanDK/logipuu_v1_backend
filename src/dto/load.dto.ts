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
    
    @IsInt() @IsOptional() @Type(() => Number)
    puulaaniId?: number;

    @IsInt() @IsOptional() @Type(() => Number)
    puutavaraId?: number; 

    @IsInt() @IsNotEmpty() @Type(() => Number)
    kalustoNro!: number; // Vehicle number

    @IsInt() @IsNotEmpty() @Type(() => Number)
    kuljId!: number; // Driver ID

    @IsDate() @IsNotEmpty() @Type(() => Date)
    pvm!: Date;

    @IsString() @IsOptional() @MaxLength(45)
    ajomaaraysNro?: string;
    
    @IsString() @IsOptional() @MaxLength(45)
    kohde?: string;

    @IsString() @IsOptional() @MaxLength(45)
    lahto?: string;

    @IsNumber() @IsOptional() @Min(0) @Type(() => Number)
    m3?: number;

    @IsNumber() @IsOptional() @Min(0) @Type(() => Number)
    km?: number;
    
    @IsString() @IsOptional()
    lisatiedot?: string;
}

// For updating, most fields can be optional
export class UpdateLoadDto extends CreateLoadDto {}