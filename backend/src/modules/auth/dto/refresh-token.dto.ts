import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token emitido no login/registro' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
