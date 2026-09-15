import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './services/products.service.js';
import { SearchModule } from '@/modules/search/search.module.js';
import { PlansModule } from '@/modules/plans/plans.module.js';
import { TagsModule } from '@/modules/tags/tags.module.js';
import { AiModule } from '@/modules/ai/ai.module.js';

@Module({
  imports: [SearchModule, PlansModule, TagsModule, AiModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
