import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PUBLIC_MAX_RADIUS_METERS } from '../public.constants.js';

export class PublicComparisonQueryDto {
  @ApiPropertyOptional({ description: 'Latitude do consumidor', minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude do consumidor', minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng?: number;

  @ApiPropertyOptional({
    description: 'Raio em metros',
    minimum: 1,
    maximum: PUBLIC_MAX_RADIUS_METERS,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(PUBLIC_MAX_RADIUS_METERS)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({
    description: 'Ordem de classificação',
    enum: ['price_asc', 'price_desc', 'distance', 'availability'],
    default: 'price_asc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['price_asc', 'price_desc', 'distance', 'availability'])
  sort?: string;
}
