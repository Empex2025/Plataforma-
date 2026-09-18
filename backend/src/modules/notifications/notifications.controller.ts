import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { ErrorResponseDto } from '@/common/dto/error-response.dto.js';
import { SuccessResponseDto } from '@/common/dto/success-response.dto.js';
import { NotificationService } from './services/notification.service.js';
import { NotificationsListResponseDto } from './dto/notifications-list.dto.js';
import { UnreadResponseDto } from './dto/unread-response.dto.js';

@ApiTags('Notificações')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página' })
  @ApiOkResponse({ description: 'Notificações listadas', type: NotificationsListResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async findAll(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<NotificationsListResponseDto> {
    const userId = req.user.sub;
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = limit ? Math.min(50, Math.max(1, parseInt(limit, 10) || 20)) : 20;
    return this.notificationService.findUserNotifications(userId, pageNum, limitNum);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Listar notificações não lidas' })
  @ApiOkResponse({ description: 'Notificações não lidas', type: UnreadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async findUnread(@Request() req: { user: { sub: string } }): Promise<UnreadResponseDto> {
    return this.notificationService.findUnread(req.user.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiOkResponse({ description: 'Notificações marcadas como lidas', type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  async markAllAsRead(
    @Request() req: { user: { sub: string } },
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAllAsRead(req.user.sub);
    return { success: true };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiOkResponse({ description: 'Notificação marcada como lida', type: SuccessResponseDto })
  @ApiUnauthorizedResponse({ description: 'Não autenticado', type: ErrorResponseDto })
  @ApiForbiddenResponse({ description: 'Acesso negado', type: ErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto })
  @ApiParam({ name: 'id', description: 'UUID da notificação', format: 'uuid' })
  async markAsRead(
    @Request() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAsRead(req.user.sub, id);
    return { success: true };
  }
}
