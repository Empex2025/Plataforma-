import { IsString, IsOptional, IsBoolean, IsNumber, IsUUID, Min, Max, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MAX_PAGE_LIMIT, DEFAULT_PAGE_LIMIT, MAX_RADIUS_METERS } from '../search.constants.js';

export class SearchProductsDto {
  @ApiPropertyOptional({ description: 'Termo de busca' })
  @IsString()
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ description: 'UUID da categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'UUID da marca' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ description: 'UUID da loja' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Nome da cidade' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Sigla do estado' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  state?: string;

  @ApiPropertyOptional({ description: 'Apenas produtos com estoque' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Preço mínimo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Preço máximo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

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

  @ApiPropertyOptional({ description: 'Raio em metros', maximum: MAX_RADIUS_METERS })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_RADIUS_METERS)
  @Type(() => Number)
  radius?: number;

  @ApiPropertyOptional({ description: 'Slug da tag para filtrar' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tagSlug?: string;

  @ApiPropertyOptional({ description: 'Ordem de classificação', enum: ['relevance', 'price_asc', 'price_desc', 'distance', 'updated'] })
  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'price_asc', 'price_desc', 'distance', 'updated'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Número da página', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Itens por página', default: DEFAULT_PAGE_LIMIT, minimum: 1, maximum: MAX_PAGE_LIMIT })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  @Type(() => Number)
  limit?: number;
}
