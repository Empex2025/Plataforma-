import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AttributionType } from '@/generated/prisma/enums.js';
import {
  MAX_EXTERNAL_REF_LENGTH,
  MAX_SOURCE_LENGTH,
} from '../conversions.constants.js';

export class CreateConversionDto {
  @ApiPropertyOptional({ description: 'UUID da campanha à qual a conversão será atribuída' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Tipo do alvo', enum: ['store', 'product', 'offer'] })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetType?: string;

  @ApiPropertyOptional({ description: 'UUID do alvo' })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiProperty({ description: 'Valor da receita', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  revenue!: number;

  @ApiPropertyOptional({ description: 'Quantidade de itens', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Código da moeda (ISO 4217)', default: 'BRL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Como a conversão foi atribuída',
    enum: AttributionType,
    default: AttributionType.UNATTRIBUTED,
  })
  @IsOptional()
  @IsEnum(AttributionType)
  attributionType?: AttributionType;

  @ApiPropertyOptional({ description: 'Quando a conversão ocorreu (ISO 8601). Padrão: agora.' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional({ description: 'Sistema de origem que gerou a conversão', default: 'platform' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SOURCE_LENGTH)
  source?: string;

  @ApiPropertyOptional({
    description: 'Referência externa usada para idempotência (ex.: id do pedido)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_EXTERNAL_REF_LENGTH)
  externalRef?: string;

  @ApiPropertyOptional({ description: 'Dados extras (máx. 10KB)', type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
