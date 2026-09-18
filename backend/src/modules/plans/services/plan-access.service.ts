import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanFeature } from '../plan.constants.js';
import { DEFAULT_PLAN_TIER } from '../plan.constants.js';

interface PlanLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
  feature: PlanFeature;
}

@Injectable()
export class PlanAccessService {
  private readonly logger = new Logger(PlanAccessService.name);

  constructor(private readonly prisma: PrismaService) {}

  async can(companyId: string, feature: PlanFeature): Promise<boolean> {
    const plan = await this.getCompanyPlan(companyId);
    return this.evaluateFeature(plan, feature);
  }

  async checkLimit(companyId: string, feature: PlanFeature): Promise<PlanLimitCheck> {
    const plan = await this.getCompanyPlan(companyId);
    const limit = this.getLimit(plan, feature);

    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1, plan: plan.tier, feature };
    }

    const current = await this.getCurrentUsage(companyId, feature);

    return {
      allowed: current < limit,
      current,
      limit,
      plan: plan.tier,
      feature,
    };
  }

  async assertWithinLimit(companyId: string, feature: PlanFeature): Promise<void> {
    const result = await this.checkLimit(companyId, feature);

    if (!result.allowed) {
      throw new ForbiddenException({
        message: 'Limite do plano atingido',
        feature: result.feature,
        current: result.current,
        limit: result.limit,
        plan: result.plan,
      });
    }
  }

  private async getCurrentUsage(companyId: string, feature: PlanFeature): Promise<number> {
    switch (feature) {
      case PlanFeature.MAX_STORES:
        return this.prisma.store.count({
          where: { companyId, deletedAt: null },
        });
      case PlanFeature.MAX_PRODUCTS:
        return this.prisma.product.count({
          where: { companyId, deletedAt: null },
        });
      case PlanFeature.MAX_IMPORTS:
        return this.prisma.importJob.count({
          where: { companyId },
        });
      case PlanFeature.MAX_MEMBERS:
        return this.prisma.userCompany.count({
          where: { companyId },
        });
      default:
        return 0;
    }
  }

  private async getCompanyPlan(companyId: string): Promise<{
    tier: string;
    maxStores: number;
    maxProducts: number;
    maxImports: number;
    maxMembers: number;
    analytics: boolean;
    alerts: boolean;
    advertising: boolean;
  }> {
    const companyPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (!companyPlan || !companyPlan.plan.active) {
      const freePlan = await this.prisma.plan.findUnique({
        where: { tier: DEFAULT_PLAN_TIER as 'FREE' },
      });

      if (!freePlan) {
        this.logger.error('FREE plan not found in database');
        return {
          tier: 'FREE',
          maxStores: 1,
          maxProducts: 100,
          maxImports: 3,
          maxMembers: 2,
          analytics: false,
          alerts: false,
          advertising: false,
        };
      }

      return {
        tier: freePlan.tier,
        maxStores: freePlan.maxStores,
        maxProducts: freePlan.maxProducts,
        maxImports: freePlan.maxImports,
        maxMembers: freePlan.maxMembers,
        analytics: freePlan.analytics,
        alerts: freePlan.alerts,
        advertising: freePlan.advertising,
      };
    }

    return {
      tier: companyPlan.plan.tier,
      maxStores: companyPlan.plan.maxStores,
      maxProducts: companyPlan.plan.maxProducts,
      maxImports: companyPlan.plan.maxImports,
      maxMembers: companyPlan.plan.maxMembers,
      analytics: companyPlan.plan.analytics,
      alerts: companyPlan.plan.alerts,
      advertising: companyPlan.plan.advertising,
    };
  }

  private getLimit(plan: Awaited<ReturnType<typeof this.getCompanyPlan>>, feature: PlanFeature): number {
    switch (feature) {
      case PlanFeature.MAX_STORES: return plan.maxStores;
      case PlanFeature.MAX_PRODUCTS: return plan.maxProducts;
      case PlanFeature.MAX_IMPORTS: return plan.maxImports;
      case PlanFeature.MAX_MEMBERS: return plan.maxMembers;
      case PlanFeature.ANALYTICS: return plan.analytics ? 1 : 0;
      case PlanFeature.ALERTS: return plan.alerts ? 1 : 0;
      case PlanFeature.ADVERTISING: return plan.advertising ? 1 : 0;
      default: return 0;
    }
  }

  private evaluateFeature(plan: Awaited<ReturnType<typeof this.getCompanyPlan>>, feature: PlanFeature): boolean {
    if (feature === PlanFeature.ANALYTICS) return plan.analytics;
    if (feature === PlanFeature.ALERTS) return plan.alerts;
    if (feature === PlanFeature.ADVERTISING) return plan.advertising;
    return true;
  }
}
