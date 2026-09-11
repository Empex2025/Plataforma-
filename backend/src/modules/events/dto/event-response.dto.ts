import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiPropertyOptional()
  userId?: string | null;

  @ApiPropertyOptional()
  sessionId?: string | null;

  @ApiPropertyOptional()
  targetType?: string | null;

  @ApiPropertyOptional()
  targetId?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  lat?: number | null;

  @ApiPropertyOptional()
  lng?: number | null;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): EventResponseDto {
    const dto = new EventResponseDto();
    dto.id = plain.id as string;
    dto.type = plain.type as string;
    dto.userId = plain.userId as string | null;
    dto.sessionId = plain.sessionId as string | null;
    dto.targetType = plain.targetType as string | null;
    dto.targetId = plain.targetId as string | null;
    dto.metadata = plain.metadata as Record<string, unknown> | null;
    dto.lat = plain.lat as number | null;
    dto.lng = plain.lng as number | null;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
