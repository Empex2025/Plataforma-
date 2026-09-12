import { buildReasons, type ReasonContext } from './discovery-reasons.js';
import { REASON_THRESHOLDS } from '../discovery.constants.js';

describe('discovery-reasons', () => {
  it('should return no reasons for an empty context', () => {
    expect(buildReasons({})).toEqual([]);
  });

  it('should add "perto de você" when within nearDistance', () => {
    const ctx: ReasonContext = { distance: REASON_THRESHOLDS.nearDistance - 1 };
    expect(buildReasons(ctx)).toContain('perto de você');
  });

  it('should not add "perto de você" when beyond nearDistance', () => {
    const ctx: ReasonContext = { distance: REASON_THRESHOLDS.nearDistance + 1 };
    expect(buildReasons(ctx)).not.toContain('perto de você');
  });

  it('should add "bem avaliado" when rating meets threshold', () => {
    const ctx: ReasonContext = { ratingAverage: REASON_THRESHOLDS.highRating };
    expect(buildReasons(ctx)).toContain('bem avaliado');
  });

  it('should add "disponível agora" when in stock', () => {
    expect(buildReasons({ hasStock: true })).toContain('disponível agora');
  });

  it('should add "em oferta" when there is an active offer', () => {
    expect(buildReasons({ hasActiveOffer: true })).toContain('em oferta');
  });

  it('should add "popular na região" when views meet threshold', () => {
    expect(buildReasons({ viewCount: REASON_THRESHOLDS.popularViews })).toContain('popular na região');
  });

  it('should add "novidade" when created within newDays', () => {
    expect(buildReasons({ daysSinceCreated: REASON_THRESHOLDS.newDays })).toContain('novidade');
  });

  it('should combine multiple reasons', () => {
    const ctx: ReasonContext = {
      distance: 100,
      ratingAverage: 4.5,
      hasStock: true,
      hasActiveOffer: true,
      viewCount: 50,
      daysSinceCreated: 1,
    };
    expect(buildReasons(ctx)).toEqual([
      'perto de você',
      'bem avaliado',
      'disponível agora',
      'em oferta',
      'popular na região',
      'novidade',
    ]);
  });
});
