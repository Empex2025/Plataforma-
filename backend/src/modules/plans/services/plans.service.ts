import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { PlanAccessService } from './plan-access.service.js';
import { PlanResponseDto } from '../dto/plan-response.dto.js';
import { CompanyPlanResponseDto } from '../dto/company-plan-response.dto.js';
import { PlanUsageResponseDto } from '../dto/plan-usage-response.dto.js';
import { PlanFeature } from '../plan.constants.js';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planAccessService: PlanAccessService,
  ) {}

  async findAllPlans(): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.plan.findMany({
      where: { active: true },
      orderBy: { tier: 'asc' },
    });

    return plans.map((p) => PlanResponseDto.fromPlain(p as unknown as Record<string, unknown>));
  }

  async findCompanyPlan(companyId: string): Promise<CompanyPlanResponseDto> {
    const companyPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (!companyPlan || !companyPlan.plan.active) {
      throw new NotFoundException('No active plan assigned to this company');
    }

    return CompanyPlanResponseDto.fromPlain({
      companyId: companyPlan.companyId,
      plan: {
        id: companyPlan.plan.id,
        name: companyPlan.plan.name,
        tier: companyPlan.plan.tier,
        maxStores: companyPlan.plan.maxStores,
        maxProducts: companyPlan.plan.maxProducts,
        maxImports: companyPlan.plan.maxImports,
        maxMembers: companyPlan.plan.maxMembers,
        analytics: companyPlan.plan.analytics,
        alerts: companyPlan.plan.alerts,
      },
      startsAt: companyPlan.startsAt,
      endsAt: companyPlan.endsAt,
    } as unknown as Record<string, unknown>);
  }

  /**
   * Assign a plan to a company. Only SUPER_ADMIN/ADMIN can do this.
   */
  async assignPlan(
    companyId: string,
    planId: string,
    assignerRole: string,
  ): Promise<CompanyPlanResponseDto> {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(assignerRole)) {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can assign plans');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      throw new NotFoundException('Plan not found or inactive');
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    const existingPlan = await this.prisma.companyPlan.findUnique({
      where: { companyId },
    });

    if (existingPlan) {
      const updated = await this.prisma.companyPlan.update({
        where: { companyId },
        data: { planId, startsAt: new Date(), endsAt: null },
        include: { plan: true },
      });

      return CompanyPlanResponseDto.fromPlain({
        companyId: updated.companyId,
        plan: {
          id: updated.plan.id,
          name: updated.plan.name,
          tier: updated.plan.tier,
          maxStores: updated.plan.maxStores,
          maxProducts: updated.plan.maxProducts,
          maxImports: updated.plan.maxImports,
          maxMembers: updated.plan.maxMembers,
          analytics: updated.plan.analytics,
          alerts: updated.plan.alerts,
        },
        startsAt: updated.startsAt,
        endsAt: updated.endsAt,
      } as unknown as Record<string, unknown>);
    }

    const created = await this.prisma.companyPlan.create({
      data: {
        companyId,
        planId,
        startsAt: new Date(),
      },
      include: { plan: true },
    });

    return CompanyPlanResponseDto.fromPlain({
      companyId: created.companyId,
      plan: {
        id: created.plan.id,
        name: created.plan.name,
        tier: created.plan.tier,
        maxStores: created.plan.maxStores,
        maxProducts: created.plan.maxProducts,
        maxImports: created.plan.maxImports,
        maxMembers: created.plan.maxMembers,
        analytics: created.plan.analytics,
        alerts: created.plan.alerts,
      },
      startsAt: created.startsAt,
      endsAt: created.endsAt,
    } as unknown as Record<string, unknown>);
  }

  async getUsage(companyId: string): Promise<PlanUsageResponseDto> {
    const plan = await this.planAccessService.checkLimit(companyId, PlanFeature.MAX_STORES);

    const [stores, products, imports, members] = await Promise.all([
      this.planAccessService.checkLimit(companyId, PlanFeature.MAX_STORES),
      this.planAccessService.checkLimit(companyId, PlanFeature.MAX_PRODUCTS),
      this.planAccessService.checkLimit(companyId, PlanFeature.MAX_IMPORTS),
      this.planAccessService.checkLimit(companyId, PlanFeature.MAX_MEMBERS),
    ]);

    return {
      companyId,
      planTier: plan.plan,
      stores: { current: stores.current, limit: stores.limit },
      products: { current: products.current, limit: products.limit },
      imports: { current: imports.current, limit: imports.limit },
      members: { current: members.current, limit: members.limit },
    };
  }
}
