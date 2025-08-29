// backend/src/dto/client.dto.ts
import {
    IsString, IsNotEmpty, IsOptional, MaxLength, IsEmail,
    IsBoolean, IsEnum, Matches
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientTypeEnum } from '../types/client.types'; // Import enum from types

export class CreateClientDto {
    @IsString({ message: 'Client name must be a string.' })
    @IsNotEmpty({ message: 'Client name (Nimi) is required.' })
    @MaxLength(50, { message: 'Client name cannot exceed 50 characters.' })
    clientName!: string;

    // Corrected: Allow these fields to be explicitly null by not adding @IsNotEmpty for optional fields
    @IsString({ message: 'VAT ID must be a string.' }) @IsOptional() @MaxLength(10)
    vatId?: string | null;

    @IsString({ message: 'Address must be a string.' }) @IsOptional() @MaxLength(100)
    address?: string | null;

    @IsString({ message: 'Postal code must be a string.' }) @IsOptional() @MaxLength(10)
    postalCode?: string | null;

    @IsString({ message: 'City must be a string.' }) @IsOptional() @MaxLength(20)
    city?: string | null;

    @IsString({ message: 'Phone number must be a string.' }) @IsOptional() @MaxLength(20)
    phoneNo?: string | null;

    @IsString({ message: 'Contact person must be a string.' }) @IsOptional() @MaxLength(50)
    contactPerson?: string | null;

    @IsEmail({}, { message: 'Please provide a valid email address.' }) @IsOptional() @MaxLength(100)
    email?: string | null;

    @IsString({ message: 'Additional info must be a string.' }) @IsOptional()
    additionalInfo?: string | null;

    @IsOptional()
    @IsString({ message: 'Target color must be a string (hex code).' })
    @Matches(/^#([0-9A-Fa-f]{3,6})$/i, { message: 'Target color must be a valid hex code (e.g., #RRGGBB or #RGB).' })
    @MaxLength(7)
    targetColor?: string | null; // Corrected: Allow null here

    @IsEnum(ClientTypeEnum, { message: 'Client type must be one of the allowed values (0, 1, or 2).' })
    @IsNotEmpty({ message: 'Client type (Tyyppi) is required.' })
    @Type(() => Number)
    type!: ClientTypeEnum;

    @IsBoolean({ message: 'Active status must be a boolean.' })
    @IsOptional()
    isActive?: boolean = true;
}

export class UpdateClientDto {
    @IsString() @IsOptional() @MaxLength(50) clientName?: string;
    // Corrected: Allow these fields to be explicitly null
    @IsString() @IsOptional() @MaxLength(10) vatId?: string | null;
    @IsString() @IsOptional() @MaxLength(100) address?: string | null;
    @IsString() @IsOptional() @MaxLength(10) postalCode?: string | null;
    @IsString() @IsOptional() @MaxLength(20) city?: string | null;
    @IsString() @IsOptional() @MaxLength(20) phoneNo?: string | null;
    @IsString() @IsOptional() @MaxLength(50) contactPerson?: string | null;
    @IsEmail({}, { message: 'Please provide a valid email.'}) @IsOptional() @MaxLength(100) email?: string | null;
    @IsString() @IsOptional() additionalInfo?: string | null;
    @IsString() @IsOptional() @Matches(/^#([0-9A-Fa-f]{3,6})$/i, { message: 'Target color must be a valid hex code.' }) @MaxLength(7)
    targetColor?: string | null; // Corrected: Allow null here

    @IsEnum(ClientTypeEnum, { message: 'Client type must be one of the allowed values (0, 1, or 2).' })
    @IsOptional()
    @Type(() => Number)
    type?: ClientTypeEnum;

    @IsBoolean() @IsOptional() isActive?: boolean;
}

export { ClientTypeEnum };