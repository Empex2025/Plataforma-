import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ContactsService } from './services/contacts.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';
import { ContactResponseDto, PublicContactResponseDto } from './dto/contact-response.dto.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';

@ApiTags('Contatos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RateLimit(STRICT_RATE_LIMITS.writePublic)
  @ApiOperation({ summary: 'Registrar intenção de contato com loja' })
  @ApiCreatedResponse({ description: 'Contato registrado', type: ContactResponseDto })
  @ApiNotFoundResponse({ description: 'Loja não encontrada ou inativa', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateContactDto,
    @Request() req: { user: { sub: string } },
  ): Promise<ContactResponseDto> {
    return this.contactsService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar contatos do usuário' })
  @ApiOkResponse({ description: 'Lista de contatos', type: [ContactResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async findAll(
    @Request() req: { user: { sub: string } },
  ): Promise<ContactResponseDto[]> {
    return this.contactsService.findAll(req.user.sub);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Listar contatos de uma loja (company-scoped, sem userId)' })
  @ApiParam({ name: 'storeId', description: 'ID da loja', format: 'uuid' })
  @ApiOkResponse({ description: 'Lista de contatos da loja', type: [PublicContactResponseDto] })
  @ApiNotFoundResponse({ description: 'Loja não encontrada ou usuário sem acesso', type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido', type: ErrorResponseDto })
  async findByStore(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @Request() req: { user: { sub: string } },
  ): Promise<PublicContactResponseDto[]> {
    return this.contactsService.findByStore(storeId, req.user.sub);
  }
}
