import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}
}
