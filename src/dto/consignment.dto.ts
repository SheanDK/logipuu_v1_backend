// backend/src/dto/consignment.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

// 1. --- CREATE CONSignment ITEM DTO ---
class CreateRahtikirjaItemDto {
    @IsString()
    @IsNotEmpty()
    reitti!: string;

    @IsNumber()
    @Type(() => Number)
    m3!: number;

    @IsNumber()
    @Type(() => Number)
    km!: number;

    @IsString()
    @IsOptional()
    rahtikirjanNumero?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    kpl?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    jako?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    tievero?: number;

    @IsString()
    @IsOptional()
    lisatiedot?: string;
}

// 2. --- CREATE CONSignment DTO ---
export class CreateConsignmentDto {
    @IsInt()
    @Type(() => Number)
    asiakasId!: number;

    @IsDateString()
    pvm!: string;

    @IsString()
    @IsOptional()
    lisatiedot?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateRahtikirjaItemDto)
    rahtikirjat!: CreateRahtikirjaItemDto[];
}