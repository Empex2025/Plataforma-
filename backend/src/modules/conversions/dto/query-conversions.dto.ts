import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';

export class QueryConversionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by campaign UUID' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Filter conversions occurring at or after this date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter conversions occurring at or before this date (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
