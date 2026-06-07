import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@gustosoft.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'REMOVED_SEED_PASSWORD' })
  @IsString()
  @MinLength(8)
  password: string;
}
