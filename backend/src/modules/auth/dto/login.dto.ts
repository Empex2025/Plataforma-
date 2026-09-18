import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'E-mail do usuário', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Senha do usuário', example: 'S3nhaF0rte!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
