import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventType } from '@/generated/prisma/enums.js';
import { DISCOVERY_THRESHOLDS } from '../discovery.constants.js';

interface TrendingItem {
  targetId: string;
  viewCount: number;
  score: number;
}

@Injectable()
export class TrendingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrendingProductIds(_companyId?: string): Promise<TrendingItem[]> {
    const periodDays = DISCOVERY_THRESHOLDS.trendingPeriodDays;
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const results = await this.prisma.$queryRaw<Array<{
      target_id: string;
      view_count: bigint;
    }>>`
      SELECT target_id, COUNT(*) as view_count
      FROM events
      WHERE type = ${EventType.PRODUCT_VIEW}
        AND target_id IS NOT NULL
        AND created_at >= ${since}
      GROUP BY target_id
      HAVING COUNT(*) >= ${DISCOVERY_THRESHOLDS.trendingMinViews}
      ORDER BY view_count DESC
      LIMIT 100
    `;

    const maxViews = results.length > 0 ? Number(results[0].view_count) : 1;

    return results.map((r) => ({
      targetId: r.target_id,
      viewCount: Number(r.view_count),
      score: Number(r.view_count) / maxViews,
    }));
  }

  async getTrendingStoreIds(): Promise<TrendingItem[]> {
    const periodDays = DISCOVERY_THRESHOLDS.trendingPeriodDays;
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const results = await this.prisma.$queryRaw<Array<{
      target_id: string;
      view_count: bigint;
    }>>`
      SELECT target_id, COUNT(*) as view_count
      FROM events
      WHERE type = ${EventType.STORE_VIEW}
        AND target_id IS NOT NULL
        AND created_at >= ${since}
      GROUP BY target_id
      HAVING COUNT(*) >= ${DISCOVERY_THRESHOLDS.trendingMinViews}
      ORDER BY view_count DESC
      LIMIT 100
    `;

    const maxViews = results.length > 0 ? Number(results[0].view_count) : 1;

    return results.map((r) => ({
      targetId: r.target_id,
      viewCount: Number(r.view_count),
      score: Number(r.view_count) / maxViews,
    }));
  }

  async getProductViewCount(productId: string): Promise<number> {
    const periodDays = DISCOVERY_THRESHOLDS.trendingPeriodDays;
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const results = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM events
      WHERE type = ${EventType.PRODUCT_VIEW}
        AND target_id = ${productId}
        AND created_at >= ${since}
    `;

    return Number(results[0]?.count ?? 0);
  }
}
