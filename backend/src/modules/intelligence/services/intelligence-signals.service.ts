import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventType } from '@/generated/prisma/enums.js';

export interface EntityEngagement {
  id: string;
  views: number;
  favorites: number;
  contacts: number;
}

export interface PopularityScore {
  id: string;
  score: number;
}

@Injectable()
export class IntelligenceSignalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEntityEngagement(
    targetType: 'product' | 'store',
    ids: string[],
    since: Date,
  ): Promise<EntityEngagement[]> {
    if (ids.length === 0) return [];

    const viewType: EventType = targetType === 'product' ? EventType.PRODUCT_VIEW : EventType.STORE_VIEW;
    const favType: EventType = targetType === 'product' ? EventType.PRODUCT_FAVORITE : EventType.STORE_FAVORITE;
    const contactTypes: EventType[] = targetType === 'store'
      ? [EventType.WHATSAPP_CLICK, EventType.PHONE_CLICK]
      : [];

    const [views, favorites, contacts] = await Promise.all([
      this.prisma.event.count({
        where: { type: viewType, targetType, targetId: { in: ids }, createdAt: { gte: since } },
      }),
      this.prisma.event.count({
        where: { type: favType, targetType, targetId: { in: ids }, createdAt: { gte: since } },
      }),
      contactTypes.length > 0
        ? this.prisma.event.count({
            where: {
              type: { in: contactTypes },
              targetType,
              targetId: { in: ids },
              createdAt: { gte: since },
            },
          })
        : Promise.resolve(0),
    ]);

    const total = Math.max(views, 1);
    return ids.map((id) => ({
      id,
      views: Math.round((views / total) * 100),
      favorites: Math.round((favorites / total) * 100),
      contacts: Math.round((contacts / total) * 100),
    }));
  }

  async getPopularityScore(
    targetType: 'product' | 'store',
    ids: string[],
    since: Date,
    halfLifeDays: number = 7,
  ): Promise<PopularityScore[]> {
    if (ids.length === 0) return [];

    const viewType: EventType = targetType === 'product' ? EventType.PRODUCT_VIEW : EventType.STORE_VIEW;
    const favType: EventType = targetType === 'product' ? EventType.PRODUCT_FAVORITE : EventType.STORE_FAVORITE;
    const contactTypes: EventType[] = targetType === 'store'
      ? [EventType.WHATSAPP_CLICK, EventType.PHONE_CLICK]
      : [];

    const now = new Date();
    const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;

    const events = await this.prisma.event.findMany({
      where: {
        targetType,
        targetId: { in: ids },
        createdAt: { gte: since },
      },
      select: { targetId: true, type: true, createdAt: true },
    });

    const scores = new Map<string, number>();
    for (const id of ids) scores.set(id, 0);

    for (const event of events) {
      if (!event.targetId || !scores.has(event.targetId)) continue;
      const age = now.getTime() - event.createdAt.getTime();
      const decay = Math.pow(0.5, age / halfLifeMs);
      let weight = 1;
      if (event.type === favType) weight = 3;
      else if (contactTypes.includes(event.type)) weight = 5;
      else if (event.type !== viewType) weight = 0;

      scores.set(event.targetId, (scores.get(event.targetId) ?? 0) + weight * decay);
    }

    return [...scores.entries()]
      .map(([id, score]) => ({ id, score: Math.round(score * 100) / 100 }))
      .sort((a, b) => b.score - a.score);
  }
}
