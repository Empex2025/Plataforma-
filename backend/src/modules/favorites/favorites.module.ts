import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
