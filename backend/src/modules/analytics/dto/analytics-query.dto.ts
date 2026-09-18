import { IsOptional, IsEnum, IsDateString, IsString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export type PeriodPreset = 'today' | '7d' | '30d' | 'custom';
export type Granularity = 'day' | 'week';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ['today', '7d', '30d', 'custom'], default: '30d' })
  @IsOptional()
  @IsEnum(['today', '7d', '30d', 'custom'])
  period?: PeriodPreset = '30d';

  @ApiPropertyOptional({ description: 'Data ISO (obrigatória quando period=custom)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data ISO (obrigatória quando period=custom)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['day', 'week'], default: 'day' })
  @IsOptional()
  @IsEnum(['day', 'week'])
  granularity?: Granularity = 'day';

  @ApiPropertyOptional({ description: 'Métricas separadas por vírgula: views,favorites,contacts,reviews' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z,]+$/)
  metrics?: string;
}

export const ANALYTICS_MAX_RANGE_DAYS = 90;

export function validateAnalyticsQuery(query: AnalyticsQueryDto): void {
  if (query.period === 'custom') {
    if (!query.startDate || !query.endDate) {
      throw new Error('startDate e endDate são obrigatórios quando period=custom');
    }

    const start = new Date(query.startDate);
    const end = new Date(query.endDate);

    if (start > end) {
      throw new Error('startDate deve ser anterior ou igual a endDate');
    }

    const diffMs = end.getTime() - start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > ANALYTICS_MAX_RANGE_DAYS) {
      throw new Error(`O período personalizado não pode exceder ${ANALYTICS_MAX_RANGE_DAYS} dias`);
    }
  }
}

export function parseMetrics(metrics?: string): string[] {
  if (!metrics) return ['views', 'favorites', 'contacts', 'reviews'];
  return metrics.split(',').map((m) => m.trim()).filter(Boolean);
}
