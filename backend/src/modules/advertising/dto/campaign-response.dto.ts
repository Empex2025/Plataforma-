import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SponsoredItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): SponsoredItemResponseDto {
    const dto = new SponsoredItemResponseDto();
    dto.id = plain.id as string;
    dto.targetType = plain.targetType as string;
    dto.targetId = plain.targetId as string;
    dto.weight = plain.weight as number;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}

export class CampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  startAt?: Date | null;

  @ApiPropertyOptional()
  endAt?: Date | null;

  @ApiPropertyOptional()
  budget?: number | null;

  @ApiPropertyOptional()
  targetJson?: Record<string, unknown> | null;

  @ApiProperty({ type: [SponsoredItemResponseDto] })
  items!: SponsoredItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(plain: Record<string, unknown>): CampaignResponseDto {
    const dto = new CampaignResponseDto();
    dto.id = plain.id as string;
    dto.companyId = plain.companyId as string;
    dto.name = plain.name as string;
    dto.status = plain.status as string;
    dto.startAt = plain.startAt as Date | null;
    dto.endAt = plain.endAt as Date | null;
    dto.budget = plain.budget as number | null;
    dto.targetJson = plain.targetJson as Record<string, unknown> | null;
    dto.items = (plain.items as Array<Record<string, unknown>>)?.map(SponsoredItemResponseDto.fromPlain) ?? [];
    dto.createdAt = plain.createdAt as Date;
    dto.updatedAt = plain.updatedAt as Date;
    return dto;
  }
}
