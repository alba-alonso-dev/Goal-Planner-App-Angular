import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  emailId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password!: string;
}

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  emailId!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(200)
  password!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  mobileNo!: string;
}
