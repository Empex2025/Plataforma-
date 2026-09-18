import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { ConversionsService } from './services/conversions.service.js';
import { CreateConversionDto } from './dto/create-conversion.dto.js';
import { QueryConversionsDto } from './dto/query-conversions.dto.js';
import { ConversionResponseDto } from './dto/conversion-response.dto.js';
import type { Request } from 'express';

@ApiTags('Conversions')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('conversions')
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a conversion/sale for the current company',
    description:
      'Registers a revenue event. When campaignId is provided the conversion is attributed to that ' +
      'campaign and the campaign revenue/conversion counters are updated. Idempotent when externalRef is sent.',
  })
  @ApiCreatedResponse({ description: 'Conversion registered', type: ConversionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async register(
    @Body() dto: CreateConversionDto,
    @Req() req: Request,
  ): Promise<ConversionResponseDto> {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.conversionsService.register(companyId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List conversions for the current company' })
  @ApiOkResponse({ description: 'Conversions listed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  async list(
    @Query() query: QueryConversionsDto,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.conversionsService.list(companyId, query);
  }
}
