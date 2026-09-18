import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  campaignId?: string | null;

  @ApiPropertyOptional()
  targetType?: string | null;

  @ApiPropertyOptional()
  targetId?: string | null;

  @ApiProperty({ description: 'Revenue amount' })
  revenue!: number;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  attributionType!: string;

  @ApiProperty()
  source!: string;

  @ApiPropertyOptional()
  externalRef?: string | null;

  @ApiProperty()
  occurredAt!: Date;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): ConversionResponseDto {
    const dto = new ConversionResponseDto();
    dto.id = plain.id as string;
    dto.companyId = plain.companyId as string;
    dto.campaignId = (plain.campaignId as string | null) ?? null;
    dto.targetType = (plain.targetType as string | null) ?? null;
    dto.targetId = (plain.targetId as string | null) ?? null;
    dto.revenue = Number(plain.revenue ?? 0);
    dto.quantity = (plain.quantity as number) ?? 1;
    dto.currency = plain.currency as string;
    dto.attributionType = plain.attributionType as string;
    dto.source = plain.source as string;
    dto.externalRef = (plain.externalRef as string | null) ?? null;
    dto.occurredAt = plain.occurredAt as Date;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
