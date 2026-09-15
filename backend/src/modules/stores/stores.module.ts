import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller.js';
import { StoresService } from './services/stores.service.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { PlansModule } from '@/modules/plans/plans.module.js';
import { AiModule } from '@/modules/ai/ai.module.js';

@Module({
  imports: [SearchModule, PlansModule, AiModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
