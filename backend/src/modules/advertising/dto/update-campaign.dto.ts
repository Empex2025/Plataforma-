import { IsString, IsOptional, IsNumber, Min, Max, MinLength, MaxLength, IsDateString, IsIn, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MIN_CAMPAIGN_NAME_LENGTH, MAX_CAMPAIGN_NAME_LENGTH, SPONSORED_WEIGHT_MAX } from '../advertising.constants.js';

export class UpdateSponsoredItemDto {
  @ApiPropertyOptional({ description: 'Target type', enum: ['store', 'product', 'offer'] })
  @IsOptional()
  @IsString()
  @IsIn(['store', 'product', 'offer'])
  targetType?: 'store' | 'product' | 'offer';

  @ApiPropertyOptional({ description: 'Target UUID' })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Weight for ranking', maximum: SPONSORED_WEIGHT_MAX })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(SPONSORED_WEIGHT_MAX)
  @Type(() => Number)
  weight?: number;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name', minLength: 3, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(MIN_CAMPAIGN_NAME_LENGTH)
  @MaxLength(MAX_CAMPAIGN_NAME_LENGTH)
  name?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: 'Budget amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({ description: 'Cost per click (configured by business)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPerClick?: number;

  @ApiPropertyOptional({ description: 'Cost per mille / 1000 impressions (configured by business)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPerMille?: number;

  @ApiPropertyOptional({ description: 'Target configuration' })
  @IsOptional()
  targetJson?: Record<string, unknown>;
}
