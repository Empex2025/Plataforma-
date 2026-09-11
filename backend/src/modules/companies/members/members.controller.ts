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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service.js';
import { CreateMemberDto } from './dto/create-member.dto.js';
import { UpdateMemberDto } from './dto/update-member.dto.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { CompanyScopeGuard } from '../../../common/guards/company-scope.guard.js';
import { CompanyScope } from '../../../common/decorators/company-scope.decorator.js';
import { CompanyRoleGuard } from '../../../common/guards/company-role.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequireCompanyRole } from '../../../common/decorators/company-role.decorator.js';
import { UserRole } from '../../../generated/prisma/enums.js';

@ApiTags('Company Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, CompanyScopeGuard, CompanyRoleGuard)
@CompanyScope()
@Controller('companies/:companyId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'List company members' })
  @ApiResponse({ status: 200, description: 'Members listed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listMembers(
    @Param('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.membersService.listMembers(companyId, userId);
  }

  @Post()
  @RequireCompanyRole(UserRole.MERCHANT_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add member to company' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already member' })
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
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 400, description: 'Cannot downgrade last owner' })
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
  @ApiOperation({ summary: 'Remove member from company' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  @ApiResponse({ status: 400, description: 'Cannot remove last owner' })
  async removeMember(
    @Param('companyId') companyId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.membersService.removeMember(companyId, userId, targetUserId);
    return { success: true };
  }
}

