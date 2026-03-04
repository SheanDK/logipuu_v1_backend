// backend/src/dto/user.dto.ts
import {
    IsString, IsNotEmpty, MinLength, IsBoolean, IsOptional, IsArray, ArrayNotEmpty, IsInt, IsEmail, MaxLength
} from 'class-validator';

// 1. --- UPDATE USER PROFILE DTO ---
export class UpdateUserProfileDto {
    @IsString() @IsOptional() @MinLength(2) @MaxLength(50)
    fullName?: string;

    @IsEmail({}, { message: 'Please provide a valid email address.' }) @IsOptional() @MaxLength(100)
    email?: string;
}

// 2. --- CHANGE PASSWORD DTO ---
export class ChangePasswordDto {
    @IsString() @IsNotEmpty()
    currentPassword!: string;

    @IsString() @IsNotEmpty() @MinLength(8)
    newPassword!: string;
}

// 3. --- CREATE USER DTO ---
export class CreateUserDto {
    @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(20)
    username!: string;

    @IsString() @IsNotEmpty() @MinLength(2) @MaxLength(50)
    fullName!: string;

    @IsString() @IsNotEmpty() @MinLength(8)
    password!: string;

    @IsBoolean() @IsOptional()
    isActive?: boolean = true;

    @IsArray()
    @ArrayNotEmpty({ message: 'At least one role must be assigned.' })
    @IsInt({ each: true })
    roleIds!: number[];

    @IsInt()
    @IsOptional()
    kuljId?: number | null;
}

// 4. --- ADMIN UPDATE USER DTO ---
export class AdminUpdateUserDto {
    @IsString() @IsOptional() @MinLength(2) @MaxLength(50)
    fullName?: string;

    @IsBoolean() @IsOptional()
    isActive?: boolean;

    @IsArray() @IsOptional() @IsInt({ each: true })
    roleIds?: number[];
}


