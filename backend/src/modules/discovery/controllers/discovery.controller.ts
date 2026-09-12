import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DiscoveryService } from '../services/discovery.service.js';
import { DiscoveryQueryDto } from '../dto/discovery-query.dto.js';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard.js';

@ApiTags('Discovery')
@UseGuards(OptionalJwtAuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'Discovery feed' })
  @ApiResponse({ status: 200, description: 'Discovery results' })
  async getFeed(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getFeed(query);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Active offers' })
  @ApiResponse({ status: 200, description: 'Offers listed' })
  async getOffers(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getOffers(query);
  }

  @Get('new')
  @ApiOperation({ summary: 'New products and stores' })
  @ApiResponse({ status: 200, description: 'New items listed' })
  async getNew(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getNew(query);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Trending products and stores' })
  @ApiResponse({ status: 200, description: 'Trending items listed' })
  async getTrending(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getTrending(query);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Nearby stores' })
  @ApiResponse({ status: 200, description: 'Nearby stores listed' })
  async getNearby(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getNearby(query);
  }
}
