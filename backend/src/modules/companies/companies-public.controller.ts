import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { CnpjLookupService } from './services/cnpj-lookup.service.js';
import { CnpjCompanyResponseDto } from './dto/cnpj-lookup-response.dto.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesPublicController {
  constructor(private readonly cnpjLookupService: CnpjLookupService) {}

  @Get('cnpj/:cnpj')
  @RateLimit(STRICT_RATE_LIMITS.cnpj)
  @ApiOperation({
    summary: 'Look up company data by CNPJ (public)',
    description:
      'Accepts a CNPJ with or without mask. Validates the check digits before calling the provider. ' +
      'Use this to pre-fill the company registration form; the form submission remains the source of truth.',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ with or without mask', example: '12.345.678/0001-90' })
  @ApiOkResponse({ description: 'Normalized company data', type: CnpjCompanyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid CNPJ format or check digits' })
  @ApiNotFoundResponse({ description: 'CNPJ not found' })
  @ApiTooManyRequestsResponse({ description: 'CNPJ provider rate limit reached' })
  @ApiServiceUnavailableResponse({ description: 'CNPJ provider temporarily unavailable' })
  async lookup(@Param('cnpj') cnpj: string): Promise<CnpjCompanyResponseDto> {
    const data = await this.cnpjLookupService.lookup(cnpj);
    return CnpjCompanyResponseDto.fromData(data);
  }
}
