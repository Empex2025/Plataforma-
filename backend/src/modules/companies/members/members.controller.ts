import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MembersService } from './services/members.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { MemberResponseDto } from './dto/member-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '@/common/guards/company-scope.guard.js';
import { CompanyScope } from '@/common/decorators/company-scope.decorator.js';
import { CompanyRoleGuard } from '@/common/guards/company-role.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { RequireCompanyRole } from '@/common/decorators/company-role.decorator.js';
import { UserRole } from '@/generated/prisma/enums.js';

@ApiTags('Membros da Empresa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyScopeGuard, CompanyRoleGuard)
@CompanyScope()
@Controller('companies/:companyId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar membros da empresa' })
  @ApiParam({ name: 'companyId', description: 'Identificador da empresa', format: 'uuid' })
  @ApiOkResponse({ description: 'Membros listados', type: MemberResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  async listMembers(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.membersService.listMembers(companyId, userId);
  }

  @Post()
  @RequireCompanyRole(UserRole.MERCHANT_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar membro à empresa' })
  @ApiParam({ name: 'companyId', description: 'Identificador da empresa', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Membro adicionado', type: MemberResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Usuário já é membro', type: ErrorResponseDto })
  async addMember(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateMemberDto,
  ) {
    return this.membersService.addMember(companyId, userId, dto);
  }

  @Patch(':userId')
  @RequireCompanyRole(UserRole.MERCHANT_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar papel do membro' })
  @ApiParam({ name: 'companyId', description: 'Identificador da empresa', format: 'uuid' })
  @ApiParam({ name: 'userId', description: 'Identificador do usuário membro', format: 'uuid' })
  @ApiOkResponse({ description: 'Papel atualizado', type: MemberResponseDto })
  @ApiBadRequestResponse({ description: 'Não é possível rebaixar o último proprietário', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado', type: ErrorResponseDto })
  async updateRole(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateRole(companyId, userId, targetUserId, dto);
  }

  @Delete(':userId')
  @RequireCompanyRole(UserRole.MERCHANT_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover membro da empresa' })
  @ApiParam({ name: 'companyId', description: 'Identificador da empresa', format: 'uuid' })
  @ApiParam({ name: 'userId', description: 'Identificador do usuário membro', format: 'uuid' })
  @ApiOkResponse({ description: 'Membro removido', type: SuccessResponseDto })
  @ApiBadRequestResponse({ description: 'Não é possível remover o último proprietário', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Membro não encontrado', type: ErrorResponseDto })
  async removeMember(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.membersService.removeMember(companyId, userId, targetUserId);
    return { success: true };
  }
}
