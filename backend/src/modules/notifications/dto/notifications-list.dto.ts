import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto.js';

export class NotificationsListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
