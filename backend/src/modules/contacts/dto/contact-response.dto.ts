import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  userId?: string | null;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  value!: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): ContactResponseDto {
    const dto = new ContactResponseDto();
    dto.id = plain.id as string;
    dto.userId = plain.userId as string | null;
    dto.storeId = plain.storeId as string;
    dto.type = plain.type as string;
    dto.value = plain.value as string;
    dto.metadata = plain.metadata as Record<string, unknown> | null;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}

export class PublicContactResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  value!: string;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): PublicContactResponseDto {
    const dto = new PublicContactResponseDto();
    dto.id = plain.id as string;
    dto.storeId = plain.storeId as string;
    dto.type = plain.type as string;
    dto.value = plain.value as string;
    dto.metadata = plain.metadata as Record<string, unknown> | null;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
