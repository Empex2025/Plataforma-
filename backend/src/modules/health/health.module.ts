import { Module } from '@nestjs/common';
import { PrismaModule } from '@/db/prisma.module.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';
import { ValkeyHealthIndicator } from './valkey-health.indicator.js';

@Module({
  imports: [PrismaModule, SearchModule],
  controllers: [HealthController],
  providers: [HealthService, ValkeyHealthIndicator],
})
export class HealthModule {}
