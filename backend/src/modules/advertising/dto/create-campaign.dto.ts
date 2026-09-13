import { IsString, IsOptional, IsNumber, Min, Max, IsDateString, ValidateNested, IsArray, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MIN_CAMPAIGN_NAME_LENGTH, MAX_CAMPAIGN_NAME_LENGTH, SPONSORED_WEIGHT_MAX } from '../advertising.constants.js';

export class CreateSponsoredItemDto {
  @ApiProperty({ description: 'Target type', enum: ['store', 'product', 'offer'] })
  @IsString()
  @IsIn(['store', 'product', 'offer'])
  targetType!: 'store' | 'product' | 'offer';

  @ApiProperty({ description: 'Target UUID' })
  @IsUUID()
  targetId!: string;

  @ApiPropertyOptional({ description: 'Weight for ranking', default: 1, maximum: SPONSORED_WEIGHT_MAX })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(SPONSORED_WEIGHT_MAX)
  @Type(() => Number)
  weight?: number;
}

export class CampaignTargetJsonDto {
  @ApiPropertyOptional({ description: 'Category names to target' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'City names to target' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ description: 'State abbreviations to target' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ description: 'Search terms to target' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchTerms?: string[];
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', minLength: 3, maxLength: 100 })
  @IsString()
  @Min(MIN_CAMPAIGN_NAME_LENGTH)
  @Max(MAX_CAMPAIGN_NAME_LENGTH)
  name!: string;

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

  @ApiPropertyOptional({ description: 'Target configuration', type: CampaignTargetJsonDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignTargetJsonDto)
  targetJson?: CampaignTargetJsonDto;

  @ApiPropertyOptional({ description: 'Sponsored items', type: [CreateSponsoredItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSponsoredItemDto)
  items?: CreateSponsoredItemDto[];
}
