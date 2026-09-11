import { IsEnum, IsUUID, IsString, IsOptional, IsDecimal, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertTriggerType } from '../../../generated/prisma/enums.js';

export class CreateAlertDto {
  @ApiProperty({ description: 'Tipo da entidade alvo (ex: product, store)' })
  @IsString()
  @MaxLength(50)
  targetType!: string;

  @ApiProperty({ description: 'ID do produto ou loja' })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ enum: AlertTriggerType, description: 'Tipo de gatilho do alerta' })
  @IsEnum(AlertTriggerType)
  trigger!: AlertTriggerType;

  @ApiPropertyOptional({ description: 'Limite para o gatilho (ex: preço abaixo de R$ 20)' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  threshold?: string;
}
