import { ApiProperty } from '@nestjs/swagger';
import { NotificationResponseDto } from './notification-response.dto.js';

export class UnreadResponseDto {
  @ApiProperty()
  count!: number;

  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];
}
