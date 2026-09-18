import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanAccessService } from './services/plan-access.service.js';
import { PLAN_FEATURE_KEY } from './plan.decorator.js';
import { PlanFeature } from './plan.constants.js';

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
      throw new ForbiddenException('Contexto da empresa obrigatório para validação de plano');
    }

    const result = await this.planAccessService.checkLimit(companyId, feature);

    if (!result.allowed) {
      throw new ForbiddenException({
        message: 'Limite do plano atingido',
        feature: result.feature,
        current: result.current,
        limit: result.limit,
        plan: result.plan,
      });
    }

    return true;
  }
}
