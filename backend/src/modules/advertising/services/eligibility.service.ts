import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from '@/modules/plans/services/plan-access.service.js';
import { PlanFeature } from '@/modules/plans/plan.constants.js';

export interface EligibilityContext {
  companyId: string;
  targetType: string;
  targetId: string;
  categories?: string[];
  cities?: string[];
  states?: string[];
  searchTerms?: string[];
}

export interface EligibleSponsoredItem {
  campaignId: string;
  campaignName: string;
  targetType: string;
  targetId: string;
  weight: number;
  companyId: string;
}

@Injectable()
export class EligibilityService {
  private readonly logger = new Logger(EligibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planAccess: PlanAccessService,
  ) {}

  async findEligibleSponsoredItems(
    context: EligibilityContext,
  ): Promise<EligibleSponsoredItem[]> {
    const now = new Date();

    const activeCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { startAt: null },
          { startAt: { lte: now } },
        ],
        AND: [
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      include: {
        items: true,
        company: { select: { id: true, status: true } },
      },
    });

    const eligible: EligibleSponsoredItem[] = [];

    for (const campaign of activeCampaigns) {
      if (campaign.company.status !== 'ACTIVE') continue;

      const hasAccess = await this.planAccess.can(
        campaign.companyId,
        PlanFeature.ADVERTISING,
      );
      if (!hasAccess) continue;

      for (const item of campaign.items) {
        if (!this.isTargetValid(item.targetType, item.targetId)) continue;

        if (!this.isTargetOwnedByCampaignCompany(item.targetType, item.targetId, campaign.companyId)) continue;

        if (!this.isTargetingCompatible(campaign.targetJson as Record<string, unknown> | null, context)) continue;

        eligible.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          targetType: item.targetType,
          targetId: item.targetId,
          weight: item.weight,
          companyId: campaign.companyId,
        });
      }
    }

    return eligible;
  }

  async validateSponsoredItemEligibility(
    campaignId: string,
    targetType: string,
    targetId: string,
  ): Promise<boolean> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { company: { select: { id: true, status: true } } },
    });

    if (!campaign) return false;
    if (campaign.status !== 'ACTIVE') return false;
    if (campaign.company.status !== 'ACTIVE') return false;

    const now = new Date();
    if (campaign.startAt && campaign.startAt > now) return false;
    if (campaign.endAt && campaign.endAt < now) return false;

    const hasAccess = await this.planAccess.can(
      campaign.companyId,
      PlanFeature.ADVERTISING,
    );
    if (!hasAccess) return false;

    if (!this.isTargetValid(targetType, targetId)) return false;
    if (!this.isTargetOwnedByCampaignCompany(targetType, targetId, campaign.companyId)) return false;

    return true;
  }

  private isTargetValid(targetType: string, targetId: string): boolean {
    return ['store', 'product', 'offer'].includes(targetType) && targetId.length > 0;
  }

  private isTargetOwnedByCampaignCompany(
    _targetType: string,
    _targetId: string,
    _companyId: string,
  ): boolean {
    return true;
  }

  private isTargetingCompatible(
    targetJson: Record<string, unknown> | null,
    context: EligibilityContext,
  ): boolean {
    if (!targetJson) return true;

    const target = targetJson as {
      categories?: string[];
      cities?: string[];
      states?: string[];
      searchTerms?: string[];
    };

    if (target.categories && target.categories.length > 0) {
      if (!context.categories || context.categories.length === 0) return false;
      const hasMatch = target.categories.some((c) =>
        context.categories!.some((cc) => cc.toLowerCase() === c.toLowerCase()),
      );
      if (!hasMatch) return false;
    }

    if (target.cities && target.cities.length > 0) {
      if (!context.cities || context.cities.length === 0) return false;
      const hasMatch = target.cities.some((c) =>
        context.cities!.some((cc) => cc.toLowerCase() === c.toLowerCase()),
      );
      if (!hasMatch) return false;
    }

    if (target.states && target.states.length > 0) {
      if (!context.states || context.states.length === 0) return false;
      const hasMatch = target.states.some((s) =>
        context.states!.some((ss) => ss.toUpperCase() === s.toUpperCase()),
      );
      if (!hasMatch) return false;
    }

    if (target.searchTerms && target.searchTerms.length > 0) {
      if (!context.searchTerms || context.searchTerms.length === 0) return false;
      const hasMatch = target.searchTerms.some((t) =>
        context.searchTerms!.some((tt) => tt.toLowerCase().includes(t.toLowerCase())),
      );
      if (!hasMatch) return false;
    }

    return true;
  }
}
