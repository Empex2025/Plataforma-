import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { SearchModule } from '../search/search.module.js';
import { PlansModule } from '../plans/plans.module.js';

@Module({
  imports: [SearchModule, PlansModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
