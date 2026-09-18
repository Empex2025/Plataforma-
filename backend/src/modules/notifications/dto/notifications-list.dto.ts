import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto.js';

export class NotificationsListResponseDto {
  @ApiProperty({ description: 'Notificações', type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty({ description: 'Total de notificações' })
  total!: number;

  @ApiProperty({ description: 'Número da página' })
  page!: number;

  @ApiProperty({ description: 'Itens por página' })
  limit!: number;
}
