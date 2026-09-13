import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller.js';
import { IntelligenceService } from './services/intelligence.service.js';
import { IntelligenceSignalsService } from './services/intelligence-signals.service.js';

@Module({
  controllers: [IntelligenceController],
  providers: [IntelligenceService, IntelligenceSignalsService],
  exports: [IntelligenceService, IntelligenceSignalsService],
})
export class IntelligenceModule {}
