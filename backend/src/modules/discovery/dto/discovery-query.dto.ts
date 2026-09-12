import { IsOptional, IsNumber, IsString, IsUUID, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DISCOVERY_DEFAULT_PAGE_LIMIT, DISCOVERY_MAX_PAGE_LIMIT, DISCOVERY_THRESHOLDS } from '../discovery.constants.js';

export class DiscoveryQueryDto {
  @ApiPropertyOptional({ description: 'Company UUID' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tag slug' })
  @IsOptional()
  @IsString()
  tagSlug?: string;

  @ApiPropertyOptional({ description: 'Latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({ description: 'Radius in meters', default: DISCOVERY_THRESHOLDS.nearbyDefaultRadius })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(DISCOVERY_THRESHOLDS.nearbyMaxRadius)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: DISCOVERY_DEFAULT_PAGE_LIMIT })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(DISCOVERY_MAX_PAGE_LIMIT)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['relevance', 'distance', 'price_asc', 'price_desc', 'newest'] })
  @IsOptional()
  @IsString()
  sort?: string;
}
