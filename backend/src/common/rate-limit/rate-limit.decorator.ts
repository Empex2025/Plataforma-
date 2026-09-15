import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.constants.js';

/**
 * Applies a route-specific rate limit. When absent, the global default applies.
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
