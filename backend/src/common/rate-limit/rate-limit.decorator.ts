import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.constants.js';

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
