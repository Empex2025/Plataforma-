import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ReviewResponseDto } from './dto/review-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ReviewTargetType } from '../../generated/prisma/enums.js';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar avaliação' })
  @ApiCreatedResponse({ description: 'Avaliação criada (status: PENDING)', type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Produto/loja não encontrado ou inativo' })
  @ApiConflictResponse({ description: 'Usuário já avaliou este alvo' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async create(
    @Body() dto: CreateReviewDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.create(req.user.sub, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar avaliação (somente próprio)' })
  @ApiParam({ name: 'id', description: 'ID da avaliação', format: 'uuid' })
  @ApiOkResponse({ description: 'Avaliação atualizada (volta para PENDING)', type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Avaliação não encontrada' })
  @ApiForbiddenResponse({ description: 'Avaliação pertence a outro usuário' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover avaliação (somente próprio)' })
  @ApiParam({ name: 'id', description: 'ID da avaliação', format: 'uuid' })
  @ApiOkResponse({ description: 'Avaliação removida' })
  @ApiNotFoundResponse({ description: 'Avaliação não encontrada' })
  @ApiForbiddenResponse({ description: 'Avaliação pertence a outro usuário' })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { sub: string } },
  ): Promise<void> {
    return this.reviewsService.remove(req.user.sub, id);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar avaliações do usuário autenticado' })
  @ApiOkResponse({ description: 'Lista de avaliações', type: [ReviewResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async findMine(
    @Request() req: { user: { sub: string } },
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findMine(req.user.sub);
  }

  @Public()
  @Get('public/:targetType/:targetId')
  @ApiOperation({ summary: 'Listar avaliações aprovadas de um alvo (público)' })
  @ApiParam({ name: 'targetType', enum: ReviewTargetType, description: 'PRODUCT ou STORE' })
  @ApiParam({ name: 'targetId', description: 'ID do produto ou loja', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, description: 'Página (default 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (default 20)' })
  @ApiOkResponse({ description: 'Lista de avaliações aprovadas', type: [ReviewResponseDto] })
  async findByTarget(
    @Param('targetType') targetType: ReviewTargetType,
    @Param('targetId') targetId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.findByTarget(targetType, targetId, page, limit);
  }
}
