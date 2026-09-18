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
import { PaginationQueryDto } from '@/common/pagination/pagination-query.dto.js';

@ApiTags('Admin Advertising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/advertising')
export class AdminAdvertisingController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('campaigns')
  @ApiOperation({ summary: 'List all campaigns (platform admin)' })
  @ApiOkResponse({ description: 'List of all campaigns', type: [CampaignResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not a platform admin' })
  async findAll(@Query() query: PaginationQueryDto) {
    return this.campaignsService.findAllForPlatform(query.page, query.limit);
  }
}
