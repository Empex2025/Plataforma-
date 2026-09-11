import { IsString, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AUTOCOMPLETE_LIMIT } from '../search.constants.js';

export class AutocompleteDto {
  @ApiPropertyOptional({ description: 'Search prefix' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'Filter by type', enum: ['product', 'store', 'category', 'brand'] })
  @IsOptional()
  @IsString()
  @IsIn(['product', 'store', 'category', 'brand'])
  type?: string;

  @ApiPropertyOptional({ description: 'Max suggestions', default: AUTOCOMPLETE_LIMIT, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  limit?: number;
}
