import { REASON_THRESHOLDS } from '../discovery.constants.js';

export interface ReasonContext {
  distance?: number | null;
  ratingAverage?: number | null;
  hasStock?: boolean;
  hasActiveOffer?: boolean;
  viewCount?: number;
  daysSinceCreated?: number;
}

export function buildReasons(ctx: ReasonContext): string[] {
  const reasons: string[] = [];

  if (ctx.distance !== undefined && ctx.distance !== null && ctx.distance < REASON_THRESHOLDS.nearDistance) {
    reasons.push('perto de você');
  }

  if (ctx.ratingAverage !== undefined && ctx.ratingAverage !== null && ctx.ratingAverage >= REASON_THRESHOLDS.highRating) {
    reasons.push('bem avaliado');
  }

  if (ctx.hasStock === REASON_THRESHOLDS.inStock) {
    reasons.push('disponível agora');
  }

  if (ctx.hasActiveOffer === REASON_THRESHOLDS.hasOffer) {
    reasons.push('em oferta');
  }

  if (ctx.viewCount !== undefined && ctx.viewCount >= REASON_THRESHOLDS.popularViews) {
    reasons.push('popular na região');
  }

  if (ctx.daysSinceCreated !== undefined && ctx.daysSinceCreated <= REASON_THRESHOLDS.newDays) {
    reasons.push('novidade');
  }

  return reasons;
}
