import {
  Controller,
  Post,
  Body,
  Get,
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
  ApiConflictResponse,
  ApiGoneResponse,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshTokenDto } from '../dto/refresh-token.dto.js';
import { LogoutDto } from '../dto/logout.dto.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { RequestVerificationDto } from '../dto/request-verification.dto.js';
import { ConfirmVerificationDto } from '../dto/confirm-verification.dto.js';
import { CompleteRegistrationDto } from '../dto/complete-registration.dto.js';
import { ConvertToPjDto } from '../dto/convert-to-pj.dto.js';
import { OnboardingStateDto } from '../dto/onboarding-state.dto.js';
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
    summary: 'Registrar um novo lojista (PF ou PJ)',
    description:
      'Cria a conta vinculada a um CPF (PF) ou CNPJ (PJ) e retorna o perfil com os tokens de acesso.',
  })
  @ApiCreatedResponse({ description: 'Usuário criado com sucesso', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'E-mail ou documento já cadastrado', type: ErrorResponseDto })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({
    summary: 'Entrar com e-mail e senha',
    description: 'Autentica o usuário e retorna o perfil junto aos tokens de acesso.',
  })
  @ApiOkResponse({ description: 'Login realizado com sucesso', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciais inválidas ou conta bloqueada', type: ErrorResponseDto })
  @ApiGoneResponse({ description: 'Conta desativada', type: ErrorResponseDto })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({ summary: 'Renovar o token de acesso usando o refresh token' })
  @ApiOkResponse({ description: 'Tokens renovados', type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token inválido', type: ErrorResponseDto })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({ summary: 'Encerrar a sessão revogando o refresh token' })
  @ApiOkResponse({ description: 'Sessão encerrada' })
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
    return { ok: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({ summary: 'Solicitar código OTP de recuperação de senha' })
  @ApiOkResponse({ description: 'Solicitação registrada' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { ok: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({ summary: 'Redefinir a senha usando o código OTP' })
  @ApiOkResponse({ description: 'Senha redefinida' })
  @ApiBadRequestResponse({ description: 'Código inválido ou expirado', type: ErrorResponseDto })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { ok: true };
  }

  @Post('verification/request')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({ summary: 'Reenviar o código de verificação (e-mail/telefone)' })
  @ApiOkResponse({ description: 'Código enviado' })
  async requestVerification(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestVerificationDto,
  ) {
    await this.authService.requestVerification(userId, dto.channel);
    return { ok: true };
  }

  @Post('verification/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RateLimit(STRICT_RATE_LIMITS.auth)
  @ApiOperation({ summary: 'Confirmar o código de verificação' })
  @ApiOkResponse({ description: 'Conta verificada', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Código inválido ou expirado', type: ErrorResponseDto })
  async confirmVerification(
    @CurrentUser('sub') userId: string,
    @Body() dto: ConfirmVerificationDto,
  ) {
    return this.authService.confirmVerification(userId, dto.channel, dto.code);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Concluir o cadastro do lojista (perfil/empresa)' })
  @ApiOkResponse({ description: 'Cadastro concluído', type: UserResponseDto })
  async complete(
    @CurrentUser('sub') userId: string,
    @Body() dto: CompleteRegistrationDto,
  ) {
    return this.authService.completeRegistration(userId, dto);
  }

  @Post('convert-to-pj')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Elevar uma conta de Lojista PF para PJ (com CNPJ)' })
  @ApiOkResponse({ description: 'Conta convertida para PJ', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'CNPJ inválido', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Conta já é PJ ou CNPJ já cadastrado', type: ErrorResponseDto })
  async convertToPj(
    @CurrentUser('sub') userId: string,
    @Body() dto: ConvertToPjDto,
  ) {
    return this.authService.convertToPj(userId, dto);
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

  @Get('onboarding-state')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estado atual do onboarding (próxima etapa obrigatória)' })
  @ApiOkResponse({ description: 'Estado retornado', type: OnboardingStateDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async onboardingState(@CurrentUser('sub') userId: string) {
    return this.authService.getOnboardingState(userId);
  }
}
