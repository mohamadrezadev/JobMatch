import { IsEmail, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  declare email: string;

  @IsString()
  @MinLength(8)
  declare password: string;

  @IsString()
  declare firstName: string;

  @IsString()
  declare lastName: string;
}

export class LoginDto {
  @IsEmail()
  declare email: string;

  @IsString()
  declare password: string;
}

export class RefreshDto {
  @IsString()
  declare refreshToken: string;
}
