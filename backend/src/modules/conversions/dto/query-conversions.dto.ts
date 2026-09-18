import { IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';

export class QueryConversionsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por UUID da campanha' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Filtrar conversões ocorridas a partir desta data (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'Filtrar conversões ocorridas até esta data (ISO 8601)' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
