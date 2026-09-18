import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard.js';
import { DiscoveryService } from './services/discovery.service.js';
import { DiscoveryQueryDto } from './dto/discovery-query.dto.js';
import { DiscoveryResponseDto } from './dto/discovery-response.dto.js';

@ApiTags('Descoberta')
@UseGuards(OptionalJwtAuthGuard)
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get()
  @ApiOperation({ summary: 'Feed de descoberta' })
  @ApiOkResponse({ description: 'Resultados de descoberta', type: DiscoveryResponseDto })
  async getFeed(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getFeed(query);
  }

  @Get('offers')
  @ApiOperation({ summary: 'Ofertas ativas' })
  @ApiOkResponse({ description: 'Ofertas listadas', type: DiscoveryResponseDto })
  async getOffers(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getOffers(query);
  }

  @Get('new')
  @ApiOperation({ summary: 'Novos produtos e lojas' })
  @ApiOkResponse({ description: 'Novos itens listados', type: DiscoveryResponseDto })
  async getNew(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getNew(query);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Produtos e lojas em alta' })
  @ApiOkResponse({ description: 'Itens em alta listados', type: DiscoveryResponseDto })
  async getTrending(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getTrending(query);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Lojas próximas' })
  @ApiOkResponse({ description: 'Lojas próximas listadas', type: DiscoveryResponseDto })
  async getNearby(@Query() query: DiscoveryQueryDto) {
    return this.discoveryService.getNearby(query);
  }
}
