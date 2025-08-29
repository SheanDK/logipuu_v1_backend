// backend/src/dto/auth.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength, IsInt, IsOptional, Min, Max, IsBoolean } from 'class-validator';

/**
 * DTO for user login validation.
 */
export class UserLoginDTO {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    username!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(60) // Bcrypt hash is 60 chars, but this is for the raw password
    password!: string;
}

/**
 * Optional DTO for user registration.
 */
export class UserRegisterDTO {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    username!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    fullName!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8) // Recommend a stronger password for registration
    @MaxLength(100)
    password!: string;

    @IsInt()
    @IsOptional()
    @Min(1)
    @Max(5)
    userLevel?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;

    @IsInt()
    @IsOptional()
    driverKuljId?: number | null;
}

// NOTE: The 'ChangePasswordDto' has been intentionally and completely removed from this file.
// Its single source of truth is now 'dto/user.dto.ts'.