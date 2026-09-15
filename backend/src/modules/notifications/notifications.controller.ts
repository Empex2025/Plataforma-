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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { NotificationService } from './services/notification.service.js';
import { NotificationsListResponseDto } from './dto/notifications-list.dto.js';
import { UnreadResponseDto } from './dto/unread-response.dto.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
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
  async findUnread(@Request() req: { user: { sub: string } }): Promise<UnreadResponseDto> {
    return this.notificationService.findUnread(req.user.sub);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @Request() req: { user: { sub: string } },
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAllAsRead(req.user.sub);
    return { success: true };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req: { user: { sub: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean }> {
    await this.notificationService.markAsRead(req.user.sub, id);
    return { success: true };
  }
}
