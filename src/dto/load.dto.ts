// src/dto/load.dto.ts
import { IsInt, 
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

// FIX: UpdateLoadDto should have all fields as OPTIONAL
export class UpdateLoadDto {
    @IsEnum(LoadTypeEnum) 
    @IsOptional() // Changed from IsNotEmpty
    tyyppi?: LoadTypeEnum;

    @IsInt() 
    @IsOptional() // Changed from IsNotEmpty
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
    @IsOptional() // Changed from IsNotEmpty
    @Type(() => Number)
    kalustoNro?: number;

    @IsInt() 
    @IsOptional() // Changed from IsNotEmpty
    @Type(() => Number)
    kuljId?: number;

    @IsDate() 
    @IsOptional() // Changed from IsNotEmpty
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

    // Allow waybills array for Consignment updates
    @IsArray()
    @IsOptional()
    rahtikirjat?: any[];
}

export class UpdateLoadStatusDto {
    @IsString() 
    @IsNotEmpty() 
    @MaxLength(50)
    status!: string;
}

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

export class AcceptLoadsDto {
    @IsArray()
    @IsNotEmpty()
    @IsInt({ each: true })
    @Type(() => Number)
    loadIds!: number[];
}

export class CreateBulkLoadDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLoadDto)
    @IsNotEmpty()
    legs!: CreateLoadDto[];
}