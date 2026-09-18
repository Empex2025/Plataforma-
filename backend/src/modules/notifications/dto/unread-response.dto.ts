import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto.js';

export class UnreadResponseDto {
  @ApiProperty({ description: 'Total de notificações não lidas' })
  count!: number;

  @ApiProperty({ description: 'Notificações não lidas', type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];
}
