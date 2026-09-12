import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service.js';
import { CreateFavoriteDto } from './dto/create-favorite.dto.js';
import { FavoriteResponseDto } from './dto/favorite-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { FavoriteTargetType } from '@/generated/prisma/enums.js';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: 'Adicionar produto ou loja aos favoritos' })
  @ApiCreatedResponse({ description: 'Favorito criado', type: FavoriteResponseDto })
  @ApiNotFoundResponse({ description: 'Produto/loja não encontrado ou inativo' })
  @ApiConflictResponse({ description: 'Favorito já existe' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async create(
    @Body() dto: CreateFavoriteDto,
    @Request() req: { user: { sub: string } },
  ): Promise<FavoriteResponseDto> {
    return this.favoritesService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar favoritos do usuário' })
  @ApiQuery({ name: 'targetType', required: false, enum: FavoriteTargetType })
  @ApiOkResponse({ description: 'Lista de favoritos', type: [FavoriteResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async findAll(
    @Query('targetType') targetType?: FavoriteTargetType,
    @Request() req?: { user: { sub: string } },
  ): Promise<FavoriteResponseDto[]> {
    return this.favoritesService.findAll(req!.user.sub, targetType);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover favorito' })
  @ApiParam({ name: 'id', description: 'ID do favorito', format: 'uuid' })
  @ApiOkResponse({ description: 'Favorito removido' })
  @ApiNotFoundResponse({ description: 'Favorito não encontrado' })
  @ApiBadRequestResponse({ description: 'Favorito pertence a outro usuário' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.favoritesService.remove(req.user.sub, id);
  }
}
