import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType, OfferStatus } from '../../../generated/prisma/enums.js';

export class OfferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  storeId?: string | null;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType!: DiscountType;

  @ApiProperty()
  discountValue!: number;

  @ApiProperty({ enum: OfferStatus })
  status!: OfferStatus;

  @ApiPropertyOptional()
  startsAt?: Date | null;

  @ApiPropertyOptional()
  endsAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(offer: {
    id: string;
    companyId: string;
    storeId?: string | null;
    title: string;
    description?: string | null;
    discountType: DiscountType;
    discountValue: number | { toNumber(): number };
    status: OfferStatus;
    startsAt?: Date | null;
    endsAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OfferResponseDto {
    const dto = new OfferResponseDto();
    dto.id = offer.id;
    dto.companyId = offer.companyId;
    dto.storeId = offer.storeId ?? null;
    dto.title = offer.title;
    dto.description = offer.description ?? null;
    dto.discountType = offer.discountType;
    dto.discountValue = typeof offer.discountValue === 'number'
      ? offer.discountValue
      : offer.discountValue.toNumber();
    dto.status = offer.status;
    dto.startsAt = offer.startsAt ?? null;
    dto.endsAt = offer.endsAt ?? null;
    dto.createdAt = offer.createdAt;
    dto.updatedAt = offer.updatedAt;
    return dto;
  }
}
