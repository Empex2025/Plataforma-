import { IsString, IsOptional, IsIn, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AUTOCOMPLETE_LIMIT } from '../search.constants.js';

export class AutocompleteDto {
  @ApiPropertyOptional({ description: 'Prefixo de busca' })
  @IsString()
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo', enum: ['product', 'store', 'category', 'brand'] })
  @IsOptional()
  @IsString()
  @IsIn(['product', 'store', 'category', 'brand'])
  type?: string;

  @ApiPropertyOptional({ description: 'Máximo de sugestões', default: AUTOCOMPLETE_LIMIT, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  limit?: number;
}
