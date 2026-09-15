import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  targetType?: string | null;

  @ApiPropertyOptional()
  targetId?: string | null;

  @ApiPropertyOptional()
  readAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = plain.id as string;
    dto.userId = plain.userId as string;
    dto.type = plain.type as string;
    dto.title = plain.title as string;
    dto.message = plain.message as string;
    dto.targetType = plain.targetType as string | null;
    dto.targetId = plain.targetId as string | null;
    dto.readAt = plain.readAt as Date | null;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
