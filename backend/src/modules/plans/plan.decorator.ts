import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from './plan.constants.js';

export const PLAN_FEATURE_KEY = 'planFeature';

export const RequirePlanFeature = (feature: PlanFeature) => SetMetadata(PLAN_FEATURE_KEY, feature);
