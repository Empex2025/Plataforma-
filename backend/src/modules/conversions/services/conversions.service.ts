import {
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { AttributionType } from '@/generated/prisma/enums.js';
import type { Prisma } from '@/generated/prisma/client.js';
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from '@/common/pagination/pagination.constants.js';
import { CreateConversionDto } from '../dto/create-conversion.dto.js';
import { QueryConversionsDto } from '../dto/query-conversions.dto.js';
import { ConversionResponseDto } from '../dto/conversion-response.dto.js';
import { DEFAULT_CONVERSION_SOURCE, DEFAULT_CURRENCY } from '../conversions.constants.js';

const MAX_METADATA_SIZE_BYTES = 10240;

@Injectable()
export class ConversionsService {
  private readonly logger = new Logger(ConversionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a revenue event (conversion/sale) and, when attributed to a campaign,
   * updates the campaign lifetime counters and the daily campaign metrics atomically.
   *
   * Idempotent when `externalRef` is provided: replaying the same reference returns the
   * already-registered conversion instead of double counting.
   */
  async register(
    companyId: string,
    dto: CreateConversionDto,
  ): Promise<ConversionResponseDto> {
    const revenue = this.toMoney(dto.revenue);
    const externalRef = dto.externalRef?.trim() || null;

    if (externalRef) {
      const existing = await this.findByExternalRef(companyId, externalRef);
      if (existing) return ConversionResponseDto.fromPlain(existing);
    }

    if (dto.campaignId) {
      await this.assertCampaignOwnership(companyId, dto.campaignId);
    }

    if (dto.targetType && dto.targetId) {
      await this.assertTargetOwnership(companyId, dto.targetType, dto.targetId);
    }

    this.validateMetadata(dto.metadata);

    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const quantity = dto.quantity ?? 1;

    try {
      const conversion = await this.prisma.$transaction(async (tx) => {
        const created = await tx.conversion.create({
          data: {
            companyId,
            campaignId: dto.campaignId ?? null,
            targetType: dto.targetType ?? null,
            targetId: dto.targetId ?? null,
            revenue,
            quantity,
            currency: dto.currency ?? DEFAULT_CURRENCY,
            attributionType: dto.attributionType ?? AttributionType.UNATTRIBUTED,
            source: dto.source ?? DEFAULT_CONVERSION_SOURCE,
            externalRef,
            occurredAt,
            metadata: (dto.metadata as Prisma.InputJsonValue) ?? undefined,
          },
        });

        if (created.campaignId) {
          await tx.campaign.update({
            where: { id: created.campaignId },
            data: {
              conversions: { increment: 1 },
              revenue: { increment: revenue },
            },
          });

          const day = this.startOfDay(occurredAt);
          await tx.campaignMetric.upsert({
            where: {
              campaignId_date: { campaignId: created.campaignId, date: day },
            },
            update: {
              conversions: { increment: 1 },
              revenue: { increment: revenue },
            },
            create: {
              campaignId: created.campaignId,
              date: day,
              conversions: 1,
              revenue,
            },
          });
        }

        return created;
      });

      return ConversionResponseDto.fromPlain(conversion as unknown as Record<string, unknown>);
    } catch (error) {
      if (externalRef && this.isUniqueViolation(error)) {
        const existing = await this.findByExternalRef(companyId, externalRef);
        if (existing) return ConversionResponseDto.fromPlain(existing);
      }
      throw error;
    }
  }

  async list(
    companyId: string,
    query: QueryConversionsDto,
  ): Promise<PaginatedResult<ConversionResponseDto>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);

    const where: Prisma.ConversionWhereInput = { companyId };
    if (query.campaignId) where.campaignId = query.campaignId;
    if (query.from || query.to) {
      where.occurredAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.conversion.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversion.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => ConversionResponseDto.fromPlain(item as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
    );
  }

  private async assertCampaignOwnership(companyId: string, campaignId: string): Promise<void> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { companyId: true },
    });

    if (!campaign || campaign.companyId !== companyId) {
      throw new ForbiddenException('A campanha não pertence a esta empresa');
    }
  }

  private async assertTargetOwnership(
    companyId: string,
    targetType: string,
    targetId: string,
  ): Promise<void> {
    let owned = false;

    switch (targetType) {
      case 'store': {
        const store = await this.prisma.store.findUnique({ where: { id: targetId } });
        owned = store?.companyId === companyId;
        break;
      }
      case 'product': {
        const product = await this.prisma.product.findUnique({ where: { id: targetId } });
        owned = product?.companyId === companyId;
        break;
      }
      case 'offer': {
        const offer = await this.prisma.offer.findUnique({ where: { id: targetId } });
        owned = offer?.companyId === companyId;
        break;
      }
      default:
        owned = false;
    }

    if (!owned) {
      throw new ForbiddenException(
        `O alvo ${targetType} ${targetId} não pertence a esta empresa`,
      );
    }
  }

  private findByExternalRef(companyId: string, externalRef: string) {
    return this.prisma.conversion.findUnique({
      where: { companyId_externalRef: { companyId, externalRef } },
    });
  }

  private validateMetadata(metadata: Record<string, unknown> | undefined): void {
    if (!metadata) return;
    const serialized = JSON.stringify(metadata);
    if (serialized.length > MAX_METADATA_SIZE_BYTES) {
      throw new ForbiddenException('Os metadados da conversão excedem o tamanho máximo');
    }
  }

  private startOfDay(date: Date): Date {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  private toMoney(value: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.round(parsed * 100) / 100;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
