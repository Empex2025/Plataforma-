import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '../../common/guards/company-scope.guard.js';
import { CompanyRoleGuard } from '../../common/guards/company-role.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireCompanyRole } from '../../common/decorators/company-role.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new company' })
  @ApiResponse({ status: 201, description: 'Company created with owner membership' })
  @ApiResponse({ status: 409, description: 'Slug or CNPJ already in use' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List companies for current user' })
  @ApiResponse({ status: 200, description: 'Companies listed' })
  async listByUser(@CurrentUser('sub') userId: string) {
    return this.companiesService.listByUser(userId);
  }

  @Get(':companyId')
  @UseGuards(CompanyScopeGuard)
  @ApiOperation({ summary: 'Get company details' })
  @ApiResponse({ status: 200, description: 'Company returned' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findById(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.companiesService.findById(companyId, userId);
  }

  @Patch(':companyId')
  @UseGuards(CompanyScopeGuard, CompanyRoleGuard)
  @RequireCompanyRole(UserRole.MERCHANT_OWNER)
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Company updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(companyId, userId, dto);
  }
}

