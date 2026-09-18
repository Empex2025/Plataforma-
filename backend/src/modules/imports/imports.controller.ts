import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ImportsService } from './services/imports.service.js';
import { CreateImportDto } from './dto/create-import.dto.js';
import { ImportResponseDto } from './dto/import-response.dto.js';
import { ImportErrorResponseDto } from './dto/import-error-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';
import { ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB } from './imports.constants.js';
import type { Request } from 'express';
import type { MulterFile } from './imports.types.js';

const CSV_FILE_LIMITS = {
  fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  files: 1,
};

function csvFileFilter(
  _req: unknown,
  file: { originalname: string; mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const lowerName = file.originalname.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (hasValidExtension && hasValidMime) {
    callback(null, true);
    return;
  }

  callback(new BadRequestException('Tipo de arquivo inválido. Apenas arquivos CSV são permitidos.'), false);
}

@ApiTags('Importações')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true, description: 'Identificador da empresa (tenant)' })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit(STRICT_RATE_LIMITS.imports)
  @UseInterceptors(FileInterceptor('file', { limits: CSV_FILE_LIMITS, fileFilter: csvFileFilter }))
  @ApiOperation({ summary: 'Criar uma nova importação' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        storeId: { type: 'string', format: 'uuid' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 202, description: 'Importação criada', type: ImportResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Conflito de dados', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateImportDto,
    @UploadedFile() file: MulterFile,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.importsService.create(companyId, userId, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Listar importações da empresa atual' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página' })
  @ApiOkResponse({
    description: 'Importações listadas (envelope paginado: data, total)',
    type: ImportResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listByCompany(
    @CurrentUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.importsService.listByCompany(companyId, userId, page, limit);
  }

  @Get(':importId')
  @ApiOperation({ summary: 'Obter detalhes da importação' })
  @ApiOkResponse({ description: 'Importação retornada', type: ImportResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async findById(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.importsService.findById(companyId, importId, userId);
  }

  @Get(':importId/errors')
  @ApiOperation({ summary: 'Obter erros da importação' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página' })
  @ApiOkResponse({
    description: 'Erros da importação listados (envelope paginado: data, total)',
    type: ImportErrorResponseDto,
    isArray: true,
  })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async findErrors(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.importsService.findErrors(companyId, importId, userId, page, limit);
  }

  @Post(':importId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar importação' })
  @ApiOkResponse({ description: 'Importação cancelada', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  async cancel(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    await this.importsService.cancel(companyId, importId, userId);
    return { success: true };
  }
}
