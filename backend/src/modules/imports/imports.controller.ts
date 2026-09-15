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
} from '@nestjs/swagger';
import { ImportsService } from './services/imports.service.js';
import { CreateImportDto } from './dto/create-import.dto.js';
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

/**
 * Rejects non-CSV uploads before the file is buffered, complementing the
 * service-level validation (defense in depth).
 */
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

  callback(new BadRequestException('Invalid file type. Only CSV files are allowed.'), false);
}

@ApiTags('Imports')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Company-Id', required: true })
@UseGuards(JwtAuthGuard, CompanyScopeGuard)
@CompanyScope()
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit(STRICT_RATE_LIMITS.imports)
  @UseInterceptors(FileInterceptor('file', { limits: CSV_FILE_LIMITS, fileFilter: csvFileFilter }))
  @ApiOperation({ summary: 'Create a new import job' })
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
  @ApiResponse({ status: 202, description: 'Import job created' })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Rate limit exceeded' })
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
  @ApiOperation({ summary: 'List import jobs for current company' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Import jobs listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
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
  @ApiOperation({ summary: 'Get import job details' })
  @ApiResponse({ status: 200, description: 'Import job returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  async findById(
    @Param('importId', ParseUUIDPipe) importId: string,
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const companyId = (req as unknown as { userCompany: { companyId: string } }).userCompany.companyId;
    return this.importsService.findById(companyId, importId, userId);
  }

  @Get(':importId/errors')
  @ApiOperation({ summary: 'Get import job errors' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Import errors returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
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
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiResponse({ status: 200, description: 'Import job cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel import' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
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
