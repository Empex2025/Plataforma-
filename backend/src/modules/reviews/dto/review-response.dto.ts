import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(plain: Record<string, unknown>): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = plain.id as string;
    dto.userId = plain.userId as string;
    dto.targetType = plain.targetType as string;
    dto.targetId = plain.targetId as string;
    dto.rating = plain.rating as number;
    dto.title = plain.title as string | null;
    dto.comment = plain.comment as string | null;
    dto.status = plain.status as string;
    dto.createdAt = plain.createdAt as Date;
    dto.updatedAt = plain.updatedAt as Date;
    return dto;
  }
}

export class PublicReviewResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  title?: string | null;

  @ApiPropertyOptional()
  comment?: string | null;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): PublicReviewResponseDto {
    const dto = new PublicReviewResponseDto();
    dto.id = plain.id as string;
    dto.targetType = plain.targetType as string;
    dto.targetId = plain.targetId as string;
    dto.rating = plain.rating as number;
    dto.title = plain.title as string | null;
    dto.comment = plain.comment as string | null;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
