import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller.js';
import { StoresService } from './stores.service.js';
import { SearchModule } from '../search/search.module.js';
import { PlansModule } from '../plans/plans.module.js';

@Module({
  imports: [SearchModule, PlansModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
