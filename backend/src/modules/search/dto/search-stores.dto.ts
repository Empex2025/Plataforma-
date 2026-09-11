import { IsString, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MAX_PAGE_LIMIT, DEFAULT_PAGE_LIMIT, MAX_RADIUS_METERS } from '../search.constants.js';

export class SearchStoresDto {
  @ApiPropertyOptional({ description: 'Search term' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'State abbreviation' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'Category name' })
  @IsOptional()
  @IsString()
  category?: string;

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

  @ApiPropertyOptional({ description: 'Radius in meters', maximum: MAX_RADIUS_METERS })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_RADIUS_METERS)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['relevance', 'distance', 'updated'] })
  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'distance', 'updated'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: DEFAULT_PAGE_LIMIT, minimum: 1, maximum: MAX_PAGE_LIMIT })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  @Type(() => Number)
  limit?: number;
}
