// backend/src/dto/consignment.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

// This class validates each individual waybill (Rahtikirja) object inside the main payload
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
}

// This is the main DTO for creating a new consignment (parent Kuorma + child Rahtikirjat)
export class CreateConsignmentDto {
    @IsInt()
    @IsNotEmpty()
    @Type(() => Number)
    asiakasId!: number;

    @IsDateString()
    @IsNotEmpty()
    pvm!: string;

    @IsString()
    @IsOptional()
    lisatiedot?: string;

    @IsArray()
    @ValidateNested({ each: true }) // This ensures each object in the array is validated
    @Type(() => CreateRahtikirjaItemDto)
    rahtikirjat!: CreateRahtikirjaItemDto[];
}

// For updates, all fields can be optional, but the structure is the same.
// For simplicity, we can reuse the create DTO logic, or create a specific update DTO.
export class UpdateConsignmentDto extends CreateConsignmentDto {}