import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { StoreOnboardingService } from './services/store-onboarding.service.js';
import { StoreOnboardingDto } from './dto/store-onboarding.dto.js';
import { StoreResponseDto } from './dto/store-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';

@ApiTags('Lojas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresOnboardingController {
  constructor(private readonly onboardingService: StoreOnboardingService) {}

  @Post('onboarding')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Configurar a loja durante o onboarding',
    description:
      'Resolve (ou cria) a empresa do usuário autenticado e cria a loja vinculada.',
  })
  @ApiCreatedResponse({ description: 'Loja criada', type: StoreResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: StoreOnboardingDto,
  ) {
    return this.onboardingService.create(userId, dto);
  }
}
