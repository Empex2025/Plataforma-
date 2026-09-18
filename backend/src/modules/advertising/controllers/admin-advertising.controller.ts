import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { CampaignsService } from '../services/campaigns.service.js';
import { CampaignResponseDto } from '../dto/campaign-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';

@ApiTags('Publicidade Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/advertising')
export class AdminAdvertisingController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('campaigns')
  @ApiOperation({ summary: 'Listar todas as campanhas (admin da plataforma)' })
  @ApiOkResponse({
    description: 'Lista de todas as campanhas (envelope paginado: data, total, page, limit, totalPages)',
    type: CampaignResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.campaignsService.findAllForPlatform(query.page, query.limit);
  }
}
