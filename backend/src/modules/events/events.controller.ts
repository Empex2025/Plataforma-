import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventResponseDto } from './dto/event-response.dto.js';
import { QueryEventsDto } from './dto/query-events.dto.js';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RateLimit } from '@/common/rate-limit/rate-limit.decorator.js';
import { STRICT_RATE_LIMITS } from '@/common/rate-limit/rate-limit.constants.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @RateLimit(STRICT_RATE_LIMITS.writePublic)
  @ApiOperation({
    summary: 'Registrar evento (aceita autenticado ou anônimo)',
    description:
      'Registra um evento de interação. Aceita requisições anônimas (sem token) ou autenticadas. ' +
      'Se um token válido for enviado, o evento é associado ao usuário. Token inválido resulta em 401.',
  })
  @ApiCreatedResponse({ description: 'Evento registrado com sucesso', type: EventResponseDto })
  @ApiBadRequestResponse({ description: 'Payload inválido ou metadata acima do limite' })
  @ApiUnauthorizedResponse({ description: 'Token enviado é inválido' })
  async track(
    @Body() dto: CreateEventDto,
    @Request() req: { user?: { sub?: string } },
  ): Promise<EventResponseDto> {
    const userId = req.user?.sub ?? null;
    return this.eventsService.track(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar eventos do usuário autenticado' })
  @ApiOkResponse({ description: 'Lista de eventos do usuário', type: [EventResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token ausente ou inválido' })
  async findAll(
    @Query() query: QueryEventsDto,
    @Request() req: { user: { sub: string } },
  ): Promise<EventResponseDto[]> {
    return this.eventsService.findAll(req.user.sub, query);
  }
}
