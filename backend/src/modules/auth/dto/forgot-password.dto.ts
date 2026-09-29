import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ description: 'E-mail da conta', example: 'contato@provedor.com' })
  @IsEmail()
  email!: string;
}
