import { IsString, IsOptional, IsNumber, Min, Max, MinLength, MaxLength, IsDateString, IsIn, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MIN_CAMPAIGN_NAME_LENGTH, MAX_CAMPAIGN_NAME_LENGTH, SPONSORED_WEIGHT_MAX } from '../advertising.constants.js';

export class UpdateSponsoredItemDto {
  @ApiPropertyOptional({ description: 'Tipo do alvo', enum: ['store', 'product', 'offer'] })
  @IsOptional()
  @IsString()
  @IsIn(['store', 'product', 'offer'])
  targetType?: 'store' | 'product' | 'offer';

  @ApiPropertyOptional({ description: 'UUID do alvo' })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Peso para o ranqueamento', maximum: SPONSORED_WEIGHT_MAX })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(SPONSORED_WEIGHT_MAX)
  @Type(() => Number)
  weight?: number;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Nome da campanha', minLength: 3, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(MIN_CAMPAIGN_NAME_LENGTH)
  @MaxLength(MAX_CAMPAIGN_NAME_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: 'Data de início (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Data de término (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: 'Valor do orçamento', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({ description: 'Custo por clique (configurado pelo negócio)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPerClick?: number;

  @ApiPropertyOptional({ description: 'Custo por mil / 1000 impressões (configurado pelo negócio)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPerMille?: number;

  @ApiPropertyOptional({ description: 'Configuração de segmentação' })
  @IsOptional()
  targetJson?: Record<string, unknown>;
}
