import { ApiProperty } from '@nestjs/swagger';

export class FavoriteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): FavoriteResponseDto {
    const dto = new FavoriteResponseDto();
    dto.id = plain.id as string;
    dto.targetType = plain.targetType as string;
    dto.targetId = plain.targetId as string;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
