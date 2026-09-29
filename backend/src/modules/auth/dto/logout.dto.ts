import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token a ser revogado' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
