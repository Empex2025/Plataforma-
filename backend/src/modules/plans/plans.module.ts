import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import { PlanAccessService } from './plan-access.service.js';
import { PlanGuard } from './plan.guard.js';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlanAccessService, PlanGuard],
  exports: [PlansService, PlanAccessService, PlanGuard],
})
export class PlansModule {}
