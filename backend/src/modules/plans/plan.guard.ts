import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanAccessService } from './plan-access.service.js';
import { PLAN_FEATURE_KEY } from './plan.decorator.js';
import { PlanFeature } from './plan.constants.js';

/**
 * Guard that enforces `@RequirePlanFeature(...)` on a route.
 *
 * NOT ATTACHED TO ANY ROUTE YET. It is exported by PlansModule and ready to be
 * used via `@UseGuards(JwtAuthGuard, CompanyScopeGuard, PlanGuard)`. Until then,
 * plan limits are enforced inside the services with `PlanAccessService`.
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private planAccessService: PlanAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeature>(PLAN_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const companyId = request.userCompany?.companyId ?? request.params?.companyId;

    if (!companyId) {
      throw new ForbiddenException('Company context required for plan validation');
    }

    const result = await this.planAccessService.checkLimit(companyId, feature);

    if (!result.allowed) {
      throw new ForbiddenException({
        message: 'Plan limit reached',
        feature: result.feature,
        current: result.current,
        limit: result.limit,
        plan: result.plan,
      });
    }

    return true;
  }
}
