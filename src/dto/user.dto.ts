// backend/src/dto/user.dto.ts
import { 
    IsString, IsNotEmpty, MinLength, IsBoolean, IsOptional, IsArray, ArrayNotEmpty, IsInt, IsEmail, MaxLength
} from 'class-validator';

// --- DTO for a logged-in user updating their OWN profile ---
export class UpdateUserProfileDto {
    @IsString() @IsOptional() @MinLength(2) @MaxLength(50)
    fullName?: string;

    @IsEmail({}, { message: 'Please provide a valid email address.' }) @IsOptional() @MaxLength(100)
    email?: string;
}

// --- DTO for a logged-in user changing their OWN password ---
export class ChangePasswordDto {
    @IsString() @IsNotEmpty()
    currentPassword!: string;

    @IsString() @IsNotEmpty() @MinLength(8)
    newPassword!: string;
}

// --- DTO for an ADMIN creating a NEW user (FINAL CORRECTED VERSION) ---
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
}

// --- DTO for an ADMIN updating ANY user's details (FINAL CORRECTED VERSION) ---
export class AdminUpdateUserDto {
    @IsString() @IsOptional() @MinLength(2) @MaxLength(50)
    fullName?: string;

    @IsBoolean() @IsOptional()
    isActive?: boolean;

    @IsArray() @IsOptional() @IsInt({ each: true })
    roleIds?: number[];
}

