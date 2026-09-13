import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
  ApiParam,
} from '@nestjs/swagger';
import { CampaignsService } from '../services/campaigns.service.js';
import { CreateCampaignDto } from '../dto/create-campaign.dto.js';
import { UpdateCampaignDto } from '../dto/update-campaign.dto.js';
import { CampaignResponseDto } from '../dto/campaign-response.dto.js';
import { CampaignMetricsDto } from '../dto/campaign-metrics.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';

@ApiTags('Advertising')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@Controller('advertising')
export class AdvertisingController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('campaigns')
  @CompanyScope()
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiCreatedResponse({ description: 'Campaign created', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  async create(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.create(companyId, dto);
  }

  @Get('campaigns')
  @CompanyScope()
  @ApiOperation({ summary: 'List campaigns for the company' })
  @ApiOkResponse({ description: 'List of campaigns', type: [CampaignResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  async findAll(
    @Request() req: { userCompany?: { company: { id: string } } },
  ): Promise<CampaignResponseDto[]> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.findAll(companyId);
  }

  @Get('campaigns/:id')
  @CompanyScope()
  @ApiOperation({ summary: 'Get campaign details' })
  @ApiOkResponse({ description: 'Campaign details', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID', format: 'uuid' })
  async findById(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.findById(companyId, id);
  }

  @Patch('campaigns/:id')
  @CompanyScope()
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiOkResponse({ description: 'Campaign updated', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID', format: 'uuid' })
  async update(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.update(companyId, id, dto);
  }

  @Post('campaigns/:id/activate')
  @CompanyScope()
  @ApiOperation({ summary: 'Activate a campaign' })
  @ApiOkResponse({ description: 'Campaign activated', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID', format: 'uuid' })
  async activate(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.activate(companyId, id);
  }

  @Post('campaigns/:id/pause')
  @CompanyScope()
  @ApiOperation({ summary: 'Pause a campaign' })
  @ApiOkResponse({ description: 'Campaign paused', type: CampaignResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID', format: 'uuid' })
  async pause(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.pause(companyId, id);
  }

  @Get('campaigns/:id/metrics')
  @CompanyScope()
  @ApiOperation({ summary: 'Get campaign metrics' })
  @ApiOkResponse({ description: 'Campaign metrics', type: CampaignMetricsDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'User does not belong to this company or advertising not allowed' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID', format: 'uuid' })
  async getMetrics(
    @Request() req: { userCompany?: { company: { id: string } } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignMetricsDto> {
    const companyId = req.userCompany!.company.id;
    return this.campaignsService.getMetrics(companyId, id);
  }
}
