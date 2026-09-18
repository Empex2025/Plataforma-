import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual do usuário' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ description: 'Nova senha (mínimo de 8 caracteres)', example: 'N0vaS3nha!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
