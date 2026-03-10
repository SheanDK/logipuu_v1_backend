import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// 1. --- CREATE WOOD CATEGORY DTO ---
export class CreateWoodCategoryDto {
  @IsString()
  @MaxLength(50)
  puutavara!: string;

  @IsOptional()
  @IsString()
  lisatiedot?: string;

  @IsOptional()
  @IsBoolean()
  aktiivinen?: boolean;
}

// 2. --- UPDATE WOOD CATEGORY DTO ---
export class UpdateWoodCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  puutavara?: string;

  @IsOptional()
  @IsString()
  lisatiedot?: string;

  @IsOptional()
  @IsBoolean()
  aktiivinen?: boolean;
}
