import { IsString, IsNotEmpty, IsEmail, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateDriverDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(50)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    phoneNo!: string;

    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email!: string;

    @IsBoolean()
    @IsOptional()
    hasAlerts?: boolean = true;
}

export class UpdateDriverDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    @MaxLength(50)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    phoneNo?: string;

    @IsEmail()
    @IsOptional()
    @MaxLength(100)
    email?: string;

    @IsBoolean()
    @IsOptional()
    hasAlerts?: boolean;
}