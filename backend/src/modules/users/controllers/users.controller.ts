import { Controller, Get, Patch, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuário atual' })
  @ApiOkResponse({ description: 'Perfil do usuário retornado', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado', type: ErrorResponseDto })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do usuário atual' })
  @ApiOkResponse({ description: 'Perfil do usuário atualizado', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado', type: ErrorResponseDto })
  async updateMe(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alterar senha do usuário atual' })
  @ApiOkResponse({ description: 'Senha alterada com sucesso', type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Senha atual incorreta', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado', type: ErrorResponseDto })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(userId, dto);
    return { success: true };
  }

  @Post('me/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar conta do usuário atual' })
  @ApiOkResponse({ description: 'Conta desativada', type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado', type: ErrorResponseDto })
  async deactivate(@CurrentUser('sub') userId: string) {
    await this.usersService.deactivate(userId);
    return { success: true };
  }
}
