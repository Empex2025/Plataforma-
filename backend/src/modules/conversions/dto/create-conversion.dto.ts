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
  @ApiPropertyOptional({ description: 'Campaign UUID the conversion is attributed to' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Target type', enum: ['store', 'product', 'offer'] })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetType?: string;

  @ApiPropertyOptional({ description: 'Target UUID' })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiProperty({ description: 'Revenue amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  revenue!: number;

  @ApiPropertyOptional({ description: 'Quantity of items', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ description: 'ISO 4217 currency code', default: 'BRL' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'How the conversion was attributed',
    enum: AttributionType,
    default: AttributionType.UNATTRIBUTED,
  })
  @IsOptional()
  @IsEnum(AttributionType)
  attributionType?: AttributionType;

  @ApiPropertyOptional({ description: 'When the conversion occurred (ISO 8601). Defaults to now.' })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @ApiPropertyOptional({ description: 'Source system that produced the conversion', default: 'platform' })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_SOURCE_LENGTH)
  source?: string;

  @ApiPropertyOptional({
    description: 'External reference used for idempotency (e.g. order id)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_EXTERNAL_REF_LENGTH)
  externalRef?: string;

  @ApiPropertyOptional({ description: 'Extra data (max 10KB)', type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
