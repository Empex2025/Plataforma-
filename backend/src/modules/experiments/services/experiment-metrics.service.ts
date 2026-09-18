import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { resolvePeriod } from '@/modules/intelligence/helpers/intelligence-period.js';
import {
  AnalyticsQueryDto,
  validateAnalyticsQuery,
} from '@/modules/analytics/dto/analytics-query.dto.js';
import { EXPERIMENT_METRIC_EVENT_TYPES } from '../experiments.constants.js';
import { ExperimentResultsDto, ExperimentVariantResultDto } from '../dto/experiment-results.dto.js';
import { ExperimentStatisticsService, type VariantCounts } from './experiment-statistics.service.js';

interface RawCountRow {
  variant_id: string;
  type: string;
  count: bigint;
}

@Injectable()
export class ExperimentMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statisticsService: ExperimentStatisticsService,
  ) {}

  async getResults(id: string, query: AnalyticsQueryDto): Promise<ExperimentResultsDto> {
    try {
      validateAnalyticsQuery(query);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Parâmetros de consulta inválidos');
    }

    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    });
    if (!experiment) throw new NotFoundException('Experimento não encontrado');

    const resolved = resolvePeriod(query.period, query.startDate, query.endDate);
    const from = experiment.startAt && experiment.startAt > resolved.start
      ? experiment.startAt
      : resolved.start;
    const end = experiment.endAt && experiment.endAt < resolved.end
      ? experiment.endAt
      : resolved.end;

    const sampleRows = await this.prisma.experimentAssignment.groupBy({
      by: ['variantId'],
      where: { experimentId: id },
      _count: { _all: true },
    });
    const sampleByVariant = new Map(sampleRows.map((row) => [row.variantId, row._count._all]));

    const eventTypeList = EXPERIMENT_METRIC_EVENT_TYPES.map((type) => `'${type}'`).join(',');
    const countRows = await this.prisma.$queryRawUnsafe<RawCountRow[]>(
      `SELECT a.variant_id, e.type::text AS type, COUNT(*)::bigint AS count
       FROM experiment_assignments a
       JOIN events e ON (
         (a.subject_type = 'user' AND e.user_id::text = a.subject_id)
         OR (a.subject_type = 'session' AND e.session_id = a.subject_id)
       )
       WHERE a.experiment_id = $1::uuid
         AND e.created_at >= $2
         AND e.created_at <= $3
         AND e.type::text IN (${eventTypeList})
       GROUP BY a.variant_id, e.type::text`,
      id,
      from,
      end,
    );

    const countsByVariant = new Map<string, Record<string, number>>();
    for (const row of countRows) {
      const counts = countsByVariant.get(row.variant_id) ?? {};
      counts[row.type] = Number(row.count);
      countsByVariant.set(row.variant_id, counts);
    }

    const variants: ExperimentVariantResultDto[] = [];
    const variantCounts: VariantCounts[] = [];

    for (const variant of experiment.variants) {
      const counts = countsByVariant.get(variant.id) ?? {};
      const impressions = counts['RECOMMENDATION_IMPRESSION'] ?? 0;
      const clicks = counts['RECOMMENDATION_CLICK'] ?? 0;
      const favorites = (counts['PRODUCT_FAVORITE'] ?? 0) + (counts['STORE_FAVORITE'] ?? 0);
      const contacts = (counts['WHATSAPP_CLICK'] ?? 0) + (counts['PHONE_CLICK'] ?? 0);

      variants.push({
        key: variant.key,
        name: variant.name,
        allocation: variant.allocation,
        sampleSize: sampleByVariant.get(variant.id) ?? 0,
        impressions,
        clicks,
        ctr: rate(clicks, impressions),
        favorites,
        favoriteRate: rate(favorites, impressions),
        contacts,
        contactRate: rate(contacts, impressions),
      });

      variantCounts.push({ variantKey: variant.key, impressions, clicks, favorites, contacts });
    }

    const statisticalAnalysis = this.statisticsService.buildAnalysis(variantCounts);

    return {
      experiment: {
        id: experiment.id,
        key: experiment.key,
        domain: experiment.domain,
        name: experiment.name,
        status: experiment.status,
        startAt: experiment.startAt,
        endAt: experiment.endAt,
      },
      period: { start: from.toISOString(), end: end.toISOString() },
      variants,
      statisticalAnalysis,
      significance: {
        computed: true,
        note: 'Métricas observadas com contexto estatístico. Nenhum vencedor é declarado; a decisão de produto permanece humana.',
      },
    };
  }
}

function rate(numerator: number, denominator: number): number | null {
  if (!denominator || denominator <= 0) return null;
  return round2((numerator / denominator) * 100);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
