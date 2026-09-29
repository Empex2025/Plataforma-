import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

export class ConfirmVerificationDto {
  @ApiProperty({
    description: 'Canal de verificação',
    enum: ['email', 'phone'],
    example: 'email',
  })
  @IsIn(['email', 'phone'])
  channel!: 'email' | 'phone';

  @ApiProperty({ description: 'Código OTP de 6 dígitos', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código inválido' })
  code!: string;
}
