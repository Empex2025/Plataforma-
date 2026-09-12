import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from './plan.constants.js';

export const PLAN_FEATURE_KEY = 'planFeature';

/**
 * Route-level plan feature gate.
 *
 * NOT APPLIED TO ANY ROUTE YET. Plan limits are currently enforced imperatively
 * inside the services through `PlanAccessService.assertWithinLimit(...)`
 * (imports, stores, products, members). This decorator + `PlanGuard` are kept
 * as scaffolding for future route-level gating (e.g. analytics/alerts endpoints)
 * and will be wired when the monetization phase requires it.
 */
export const RequirePlanFeature = (feature: PlanFeature) => SetMetadata(PLAN_FEATURE_KEY, feature);
