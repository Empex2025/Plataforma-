import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller.js';
import { IntelligenceService } from './services/intelligence.service.js';
import { IntelligenceSignalsService } from './services/intelligence-signals.service.js';
import { PlansModule } from '@/modules/plans/plans.module.js';

@Module({
  imports: [PlansModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, IntelligenceSignalsService],
  exports: [IntelligenceService, IntelligenceSignalsService],
})
export class IntelligenceModule {}
