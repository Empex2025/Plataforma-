import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../../../generated/prisma/enums.js';

export class PublicOfferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: DiscountType })
  discountType!: DiscountType;

  @ApiProperty()
  discountValue!: number;

  @ApiPropertyOptional()
  startsAt?: Date | null;

  @ApiPropertyOptional()
  endsAt?: Date | null;

  @ApiPropertyOptional()
  storeId?: string | null;

  @ApiPropertyOptional()
  storeName?: string | null;

  static fromPlain(offer: {
    id: string;
    title: string;
    description?: string | null;
    discountType: DiscountType;
    discountValue: number | { toNumber(): number };
    startsAt?: Date | null;
    endsAt?: Date | null;
    storeId?: string | null;
    storeName?: string | null;
  }): PublicOfferResponseDto {
    const dto = new PublicOfferResponseDto();
    dto.id = offer.id;
    dto.title = offer.title;
    dto.description = offer.description ?? null;
    dto.discountType = offer.discountType;
    dto.discountValue =
      typeof offer.discountValue === 'number'
        ? offer.discountValue
        : offer.discountValue.toNumber();
    dto.startsAt = offer.startsAt ?? null;
    dto.endsAt = offer.endsAt ?? null;
    dto.storeId = offer.storeId ?? null;
    dto.storeName = offer.storeName ?? null;
    return dto;
  }
}
