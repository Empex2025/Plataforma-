import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlertResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  trigger!: string;

  @ApiPropertyOptional()
  threshold?: string | null;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional()
  lastTriggeredAt?: Date | null;

  @ApiProperty()
  triggeredCount!: number;

  @ApiPropertyOptional()
  lastObservedValue?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(plain: Record<string, unknown>): AlertResponseDto {
    const dto = new AlertResponseDto();
    dto.id = plain.id as string;
    dto.userId = plain.userId as string;
    dto.targetType = plain.targetType as string;
    dto.targetId = plain.targetId as string;
    dto.trigger = plain.trigger as string;
    dto.threshold = plain.threshold as string | null;
    dto.active = plain.active as boolean;
    dto.lastTriggeredAt = plain.lastTriggeredAt as Date | null;
    dto.triggeredCount = plain.triggeredCount as number;
    dto.lastObservedValue = plain.lastObservedValue as string | null;
    dto.createdAt = plain.createdAt as Date;
    dto.updatedAt = plain.updatedAt as Date;
    return dto;
  }
}
