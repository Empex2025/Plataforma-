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
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';
import { FavoriteTargetType } from '@/generated/prisma/enums.js';

@ApiTags('Favoritos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @RateLimit(STRICT_RATE_LIMITS.writePublic)
  @ApiOperation({ summary: 'Adicionar produto ou loja aos favoritos' })
  @ApiCreatedResponse({ description: 'Favorito criado', type: FavoriteResponseDto })
  @ApiNotFoundResponse({ description: 'Produto/loja não encontrado ou inativo', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Favorito já existe', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateFavoriteDto,
    @Request() req: { user: { sub: string } },
  ): Promise<FavoriteResponseDto> {
    return this.favoritesService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar favoritos do usuário' })
  @ApiQuery({ name: 'targetType', required: false, enum: FavoriteTargetType, description: 'Filtrar por tipo de alvo' })
  @ApiOkResponse({ description: 'Lista de favoritos', type: [FavoriteResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async findAll(
    @Query('targetType') targetType?: FavoriteTargetType,
    @Request() req?: { user: { sub: string } },
  ): Promise<FavoriteResponseDto[]> {
    return this.favoritesService.findAll(req!.user.sub, targetType);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover favorito' })
  @ApiParam({ name: 'id', description: 'ID do favorito', format: 'uuid' })
  @ApiOkResponse({ description: 'Favorito removido', type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Favorito não encontrado', type: ErrorResponseDto })
  @ApiBadRequestResponse({ description: 'Favorito pertence a outro usuário', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.favoritesService.remove(req.user.sub, id);
  }
}
