import { TrustSignalsDto, type TrustSignalsInput } from '../dto/trust-signals.dto.js';

const RATING_HIGH_THRESHOLD = 4.0;
const RATING_SUFFICIENT_THRESHOLD = 3;
const PRICE_FRESHNESS_DAYS = 7;
const RECENT_DAYS = 30;

export function computeTrustSignals(input: TrustSignalsInput): TrustSignalsDto {
  const now = Date.now();

  const priceFreshnessMs = PRICE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  const precoAtualizado =
    input.priceUpdatedAt !== null &&
    input.priceUpdatedAt !== undefined &&
    now - input.priceUpdatedAt.getTime() <= priceFreshnessMs;

  const recentMs = RECENT_DAYS * 24 * 60 * 60 * 1000;
  const informacaoRecente =
    input.createdAt !== null &&
    input.createdAt !== undefined &&
    now - input.createdAt.getTime() <= recentMs;

  const dto = new TrustSignalsDto();
  dto.bemAvaliado = input.ratingAverage !== null && input.ratingAverage >= RATING_HIGH_THRESHOLD;
  dto.precoAtualizado = precoAtualizado;
  dto.estoqueInformado = true;
  dto.ofertaAtiva = input.hasActiveOffer;
  dto.avaliacoesSuficientes = input.ratingCount >= RATING_SUFFICIENT_THRESHOLD;
  dto.informacaoRecente = informacaoRecente;

  return dto;
}
