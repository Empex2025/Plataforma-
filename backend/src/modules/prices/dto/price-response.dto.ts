import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '../../../generated/prisma/enums.js';

export class PriceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty({ enum: PriceType })
  type!: PriceType;

  @ApiProperty()
  value!: number;

  @ApiPropertyOptional()
  validFrom!: Date | null;

  @ApiPropertyOptional()
  validTo!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(price: {
    id: string;
    storeId: string;
    productId: string;
    type: PriceType;
    value: { toNumber: () => number } | number;
    validFrom: Date | null;
    validTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PriceResponseDto {
    const dto = new PriceResponseDto();
    dto.id = price.id;
    dto.storeId = price.storeId;
    dto.productId = price.productId;
    dto.type = price.type;
    dto.value = typeof price.value === 'number' ? price.value : price.value.toNumber();
    dto.validFrom = price.validFrom;
    dto.validTo = price.validTo;
    dto.createdAt = price.createdAt;
    dto.updatedAt = price.updatedAt;
    return dto;
  }
}
