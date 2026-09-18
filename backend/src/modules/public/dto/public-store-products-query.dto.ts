import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import {
  PUBLIC_DEFAULT_PAGE_LIMIT,
  PUBLIC_MAX_PAGE_LIMIT,
} from '../public.constants.js';

export class PublicStoreProductsQueryDto {
  @ApiPropertyOptional({ description: 'Termo de busca pelo nome do produto' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'UUID da categoria' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'UUID da marca' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Ordem de classificação',
    enum: ['name', 'price_asc', 'price_desc', 'updated'],
    default: 'name',
  })
  @IsOptional()
  @IsString()
  @IsIn(['name', 'price_asc', 'price_desc', 'updated'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Número da página', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Itens por página',
    default: PUBLIC_DEFAULT_PAGE_LIMIT,
    minimum: 1,
    maximum: PUBLIC_MAX_PAGE_LIMIT,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(PUBLIC_MAX_PAGE_LIMIT)
  @Type(() => Number)
  limit?: number;
}
