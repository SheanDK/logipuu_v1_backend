import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a wood category.
 * These are classes (not interfaces) so they can be used at runtime by validation middleware.
 */
export class CreateWoodCategoryDto {
  @IsString()
  @MaxLength(50)
  puutavara!: string;       // required

  @IsOptional()
  @IsString()
  lisatiedot?: string;      // optional

  @IsOptional()
  @IsBoolean()
  aktiivinen?: boolean;     // optional (defaults to true in service)
}

/**
 * DTO for updating a wood category (all fields optional).
 */
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
