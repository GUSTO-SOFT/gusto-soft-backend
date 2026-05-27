import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_COMPLEXITY_MESSAGE, PASSWORD_COMPLEXITY_REGEX } from './password-rules';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@gustosoft.local' })
  @IsEmail()
  @MaxLength(160)
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'token-recibido' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  nueva_password: string;
}
