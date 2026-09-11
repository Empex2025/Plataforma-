import { IsOptional, IsBoolean, IsDecimal } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlertDto {
  @ApiPropertyOptional({ description: 'Limite para o gatilho' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  threshold?: string;

  @ApiPropertyOptional({ description: 'Ativar/desativar alerta' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
