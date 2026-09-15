import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { SEARCH_PROVIDER } from '@/modules/search/search.constants.js';
import type { ISearchProvider } from '@/modules/search/providers/search-provider.interface.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

export interface ReadinessChecks {
  database: boolean;
  valkey: boolean;
  search: boolean;
}

export interface ReadinessResult {
  status: 'ok' | 'degraded' | 'unavailable';
  checks: ReadinessChecks;
}

const CHECK_TIMEOUT_MS = 1500;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly valkey: ValkeyHealthIndicator,
    @Inject(SEARCH_PROVIDER) private readonly searchProvider: ISearchProvider,
  ) {}

  liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }

  async readiness(): Promise<ReadinessResult> {
    const [database, valkey, search] = await Promise.all([
      this.checkDatabase(),
      this.checkValkey(),
      this.checkSearch(),
    ]);

    const status: ReadinessResult['status'] = !database
      ? 'unavailable'
      : valkey && search
        ? 'ok'
        : 'degraded';

    return { status, checks: { database, valkey, search } };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
      return true;
    } catch (error) {
      this.logger.warn(`Readiness: database check failed: ${(error as Error).message}`);
      return false;
    }
  }

  private async checkValkey(): Promise<boolean> {
    try {
      return await this.withTimeout(this.valkey.ping());
    } catch (error) {
      this.logger.warn(`Readiness: valkey check failed: ${(error as Error).message}`);
      return false;
    }
  }

  private async checkSearch(): Promise<boolean> {
    if (!this.searchProvider.health) return true;
    try {
      return await this.withTimeout(this.searchProvider.health());
    } catch (error) {
      this.logger.warn(`Readiness: search check failed: ${(error as Error).message}`);
      return false;
    }
  }

  private withTimeout<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('health check timeout')), CHECK_TIMEOUT_MS);
      operation
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
