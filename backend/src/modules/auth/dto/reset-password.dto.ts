import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'E-mail da conta', example: 'contato@provedor.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Código OTP de 6 dígitos recebido por e-mail/SMS', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código inválido' })
  otp!: string;

  @ApiProperty({ description: 'Nova senha (mínimo de 8 caracteres)', example: 'S3nhaF0rte!' })
  @IsString()
  @MinLength(8)
  password!: string;
}
