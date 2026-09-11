import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import {
  PUBLIC_DEFAULT_PAGE_LIMIT,
  PUBLIC_MAX_PAGE_LIMIT,
} from '../public.constants.js';

export class PublicPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
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
