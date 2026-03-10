// backend/src/dto/auth.dto.ts
import { IsString, IsNotEmpty, MinLength, MaxLength, IsInt, IsOptional, Min, Max, IsBoolean } from 'class-validator';

// 1. --- USER LOGIN DTO ---
export class UserLoginDTO {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(20)
    username!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(60)
    password!: string;
}

// 2. --- USER REGISTER DTO ---
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
    @MinLength(8)
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
