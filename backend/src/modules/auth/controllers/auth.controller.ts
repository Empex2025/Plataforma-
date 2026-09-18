import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiGoneResponse,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { AuthResponseDto } from '../dto/auth-response.dto.js';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({
    summary: 'Registrar um novo usuário',
    description: 'Cria uma conta de usuário e retorna o perfil criado junto ao token de acesso.',
  })
  @ApiCreatedResponse({ description: 'Usuário criado com sucesso', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'E-mail já cadastrado', type: ErrorResponseDto })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({
    summary: 'Entrar com e-mail e senha',
    description: 'Autentica o usuário e retorna o perfil junto ao token de acesso.',
  })
  @ApiOkResponse({ description: 'Login realizado com sucesso', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas', type: ErrorResponseDto })
  @ApiGoneResponse({ description: 'Conta desativada', type: ErrorResponseDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter usuário autenticado atual' })
  @ApiOkResponse({ description: 'Perfil do usuário retornado', type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async getMe(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
