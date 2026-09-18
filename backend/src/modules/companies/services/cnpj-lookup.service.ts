import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CNPJ_PROVIDER,
  CnpjProviderError,
  type CnpjCompanyData,
} from '@/common/providers/cnpj/cnpj.types.js';
import type { ICnpjProvider } from '@/common/providers/cnpj/cnpj-provider.interface.js';
import { CNPJ_LENGTH, isValidCnpj, normalizeCnpj } from '@/common/helpers/cnpj.util.js';

const DEFAULT_CACHE_TTL_MS = 300_000;
const MAX_CACHE_ENTRIES = 500;

interface CacheEntry {
  data: CnpjCompanyData;
  expiresAt: number;
}

@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    @Inject(CNPJ_PROVIDER) private readonly provider: ICnpjProvider,
    config: ConfigService,
  ) {
    const ttl = Number(config.get<string>('CNPJ_CACHE_TTL_MS'));
    this.cacheTtlMs = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_CACHE_TTL_MS;
  }

  /**
   * Normalizes, validates and resolves a company by CNPJ.
   *
   * Order: normalize -> length -> check digits -> provider.
   * The provider is never called for an invalid CNPJ.
   */
  async lookup(rawCnpj: string): Promise<CnpjCompanyData> {
    const cnpj = normalizeCnpj(rawCnpj);

    if (cnpj.length !== CNPJ_LENGTH) {
      throw new BadRequestException('CNPJ must contain exactly 14 digits');
    }

    if (!isValidCnpj(cnpj)) {
      throw new BadRequestException('Invalid CNPJ');
    }

    const cached = this.getFromCache(cnpj);
    if (cached) return cached;

    try {
      const data = await this.provider.findByCnpj(cnpj);

      if (!data) {
        throw new NotFoundException('CNPJ not found');
      }

      this.setCache(cnpj, data);
      return data;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;

      if (error instanceof CnpjProviderError) {
        if (error.reason === 'RATE_LIMITED') {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: 'CNPJ lookup temporarily rate limited. Please try again shortly.',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        this.logger.warn(`CNPJ provider failure (${error.reason}) for ${cnpj}`);
        throw new ServiceUnavailableException('CNPJ lookup is temporarily unavailable');
      }

      throw error;
    }
  }

  private getFromCache(cnpj: string): CnpjCompanyData | null {
    const entry = this.cache.get(cnpj);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(cnpj);
      return null;
    }

    return entry.data;
  }

  private setCache(cnpj: string, data: CnpjCompanyData): void {
    if (this.cacheTtlMs <= 0) return;

    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (entry.expiresAt <= now) this.cache.delete(key);
      }

      if (this.cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined) this.cache.delete(oldest);
      }
    }

    this.cache.set(cnpj, { data, expiresAt: Date.now() + this.cacheTtlMs });
  }
}
