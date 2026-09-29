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
import { CepLookupService } from './services/cep-lookup.service.js';
import { CnpjCompanyResponseDto } from './dto/cnpj-lookup-response.dto.js';
import { CepResponseDto } from './dto/cep-lookup-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';

@ApiTags('Empresas')
@Controller('companies')
export class CompaniesPublicController {
  constructor(
    private readonly cnpjLookupService: CnpjLookupService,
    private readonly cepLookupService: CepLookupService,
  ) {}

  @Get('cnpj/:cnpj')
  @RateLimit(STRICT_RATE_LIMITS.cnpj)
  @ApiOperation({
    summary: 'Consultar dados da empresa por CNPJ (público)',
    description:
      'Aceita um CNPJ com ou sem máscara. Valida os dígitos verificadores antes de consultar o provedor. ' +
      'Use para pré-preencher o formulário de cadastro da empresa; o envio do formulário continua sendo a fonte da verdade.',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com ou sem máscara', example: '12.345.678/0001-90' })
  @ApiOkResponse({ description: 'Dados normalizados da empresa', type: CnpjCompanyResponseDto })
  @ApiBadRequestResponse({ description: 'Formato de CNPJ inválido ou dígitos verificadores incorretos', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'CNPJ não encontrado', type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Muitas requisições', type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Serviço indisponível', type: ErrorResponseDto })
  async lookup(@Param('cnpj') cnpj: string): Promise<CnpjCompanyResponseDto> {
    const data = await this.cnpjLookupService.lookup(cnpj);
    return CnpjCompanyResponseDto.fromData(data);
  }

  @Get('cep/:cep')
  @RateLimit(STRICT_RATE_LIMITS.cep)
  @ApiOperation({
    summary: 'Consultar endereço por CEP (público)',
    description:
      'Aceita CEP com ou sem máscara. Use para pré-preencher o formulário de cadastro.',
  })
  @ApiParam({ name: 'cep', description: 'CEP com ou sem máscara', example: '01310-100' })
  @ApiOkResponse({ description: 'Endereço normalizado', type: CepResponseDto })
  @ApiBadRequestResponse({ description: 'CEP inválido', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'CEP não encontrado', type: ErrorResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Muitas requisições', type: ErrorResponseDto })
  async lookupCep(@Param('cep') cep: string): Promise<CepResponseDto> {
    const data = await this.cepLookupService.lookup(cep);
    return CepResponseDto.fromResult(data);
  }
}
