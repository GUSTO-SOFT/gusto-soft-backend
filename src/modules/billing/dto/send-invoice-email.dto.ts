import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class SendInvoiceEmailDto {
  @ApiProperty({ example: 'cliente@example.com' })
  @IsString()
  @MaxLength(254)
  email: string;
}
