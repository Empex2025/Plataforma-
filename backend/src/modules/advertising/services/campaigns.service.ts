import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';
import { CreateCampaignDto } from '../dto/create-campaign.dto.js';
import { UpdateCampaignDto } from '../dto/update-campaign.dto.js';
import { CampaignResponseDto } from '../dto/campaign-response.dto.js';
import { CampaignMetricsDto } from '../dto/campaign-metrics.dto.js';
import { SPONSORED_WEIGHT_DEFAULT } from '../advertising.constants.js';
import {
  buildPaginatedResult,
  normalizePagination,
  type PaginatedResult,
} from '@/common/pagination/pagination.constants.js';
import { SponsoredTargetType } from '@/generated/prisma/enums.js';
import type { Prisma } from '@/generated/prisma/client.js';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planAccess: PlanAccessService,
  ) {}

  async create(
    companyId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    await this.assertAdvertisingAllowed(companyId);

    if (dto.startAt && dto.endAt && new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('startAt deve ser anterior a endAt');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        companyId,
        name: dto.name,
        status: 'DRAFT',
        startAt: dto.startAt ? new Date(dto.startAt) : null,
        endAt: dto.endAt ? new Date(dto.endAt) : null,
        budget: dto.budget ?? null,
        costPerClick: dto.costPerClick ?? null,
        costPerMille: dto.costPerMille ?? null,
        targetJson: (dto.targetJson ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
      },
    });

    if (dto.items && dto.items.length > 0) {
      await this.validateAndCreateItems(campaign.id, companyId, dto.items);
    }

    return this.findById(companyId, campaign.id);
  }

  async findAll(
    companyId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<CampaignResponseDto>> {
    await this.assertAdvertisingAllowed(companyId);

    const { page: safePage, limit: safeLimit, skip } = normalizePagination(page, limit);

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: { companyId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.campaign.count({ where: { companyId } }),
    ]);

    return buildPaginatedResult(
      campaigns.map((c) => CampaignResponseDto.fromPlain(c as unknown as Record<string, unknown>)),
      total,
      safePage,
      safeLimit,
    );
  }

  async findById(companyId: string, campaignId: string): Promise<CampaignResponseDto> {
    await this.assertAdvertisingAllowed(companyId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { items: true },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('A campanha não pertence a esta empresa');
    }

    return CampaignResponseDto.fromPlain(campaign as unknown as Record<string, unknown>);
  }

  async update(
    companyId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    await this.assertAdvertisingAllowed(companyId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('A campanha não pertence a esta empresa');
    }

    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Só é possível atualizar campanhas em DRAFT');
    }

    if (dto.startAt && dto.endAt && new Date(dto.startAt) >= new Date(dto.endAt)) {
      throw new BadRequestException('startAt deve ser anterior a endAt');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.startAt !== undefined && { startAt: new Date(dto.startAt) }),
        ...(dto.endAt !== undefined && { endAt: new Date(dto.endAt) }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.costPerClick !== undefined && { costPerClick: dto.costPerClick }),
        ...(dto.costPerMille !== undefined && { costPerMille: dto.costPerMille }),
        ...(dto.targetJson !== undefined && {
          targetJson: dto.targetJson as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput,
        }),
      },
    });

    return this.findById(companyId, campaignId);
  }

  async activate(companyId: string, campaignId: string): Promise<CampaignResponseDto> {
    await this.assertAdvertisingAllowed(companyId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('A campanha não pertence a esta empresa');
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      throw new BadRequestException('Só é possível ativar campanhas em DRAFT ou PAUSED');
    }

    if (campaign.endAt && campaign.endAt < new Date()) {
      throw new BadRequestException('A campanha já expirou');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    return this.findById(companyId, campaignId);
  }

  async pause(companyId: string, campaignId: string): Promise<CampaignResponseDto> {
    await this.assertAdvertisingAllowed(companyId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('A campanha não pertence a esta empresa');
    }

    if (campaign.status !== 'ACTIVE') {
      throw new BadRequestException('Só é possível pausar campanhas ACTIVE');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    return this.findById(companyId, campaignId);
  }

  async getMetrics(
    companyId: string,
    campaignId: string,
  ): Promise<CampaignMetricsDto> {
    await this.assertAdvertisingAllowed(companyId);

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada');
    }

    if (campaign.companyId !== companyId) {
      throw new ForbiddenException('A campanha não pertence a esta empresa');
    }

    const metrics = await this.prisma.campaignMetric.aggregate({
      where: { campaignId },
      _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true },
      _count: true,
    });

    return CampaignMetricsDto.fromAggregate(
      campaignId,
      metrics._sum.impressions ?? 0,
      metrics._sum.clicks ?? 0,
      metrics._count,
      metrics._sum.spend ? Number(metrics._sum.spend) : 0,
      metrics._sum.conversions ?? 0,
      metrics._sum.revenue ? Number(metrics._sum.revenue) : 0,
    );
  }

  async findAllForPlatform(
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<CampaignResponseDto>> {
    const { page: safePage, limit: safeLimit, skip } = normalizePagination(page, limit);

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.campaign.count(),
    ]);

    return buildPaginatedResult(
      campaigns.map((c) => CampaignResponseDto.fromPlain(c as unknown as Record<string, unknown>)),
      total,
      safePage,
      safeLimit,
    );
  }

  private async assertAdvertisingAllowed(companyId: string): Promise<void> {
    const allowed = await this.planAccess.can(companyId, PlanFeature.ADVERTISING);
    if (!allowed) {
      throw new ForbiddenException(
        'Os recursos de publicidade exigem um plano com publicidade ativo. Faça upgrade para o PRO ou superior.',
      );
    }
  }

  private async validateAndCreateItems(
    campaignId: string,
    companyId: string,
    items: Array<{ targetType: string; targetId: string; weight?: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.validateTargetOwnership(companyId, item.targetType, item.targetId);

      await this.prisma.sponsoredItem.create({
        data: {
          campaignId,
          targetType: item.targetType as SponsoredTargetType,
          targetId: item.targetId,
          weight: item.weight ?? SPONSORED_WEIGHT_DEFAULT,
        },
      });
    }
  }

  private async validateTargetOwnership(
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
    }

    if (!owned) {
      throw new ForbiddenException(
        `O alvo ${targetType} ${targetId} não pertence a esta empresa`,
      );
    }
  }
}
