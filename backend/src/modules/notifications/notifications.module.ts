import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationService } from './services/notification.service.js';
import { PrismaModule } from '@/db/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
