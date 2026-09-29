import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class RequestVerificationDto {
  @ApiProperty({
    description: 'Canal de verificação',
    enum: ['email', 'phone'],
    example: 'email',
  })
  @IsIn(['email', 'phone'])
  channel!: 'email' | 'phone';
}
