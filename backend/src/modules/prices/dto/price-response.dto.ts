import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '@/generated/prisma/enums.js';

export class PriceResponseDto {
  @ApiProperty({ description: 'Identificador do preço' })
  id!: string;

  @ApiProperty({ description: 'Identificador da loja' })
  storeId!: string;

  @ApiProperty({ description: 'Identificador do produto' })
  productId!: string;

  @ApiProperty({ description: 'Tipo do preço', enum: PriceType })
  type!: PriceType;

  @ApiProperty({ description: 'Valor do preço' })
  value!: number;

  @ApiPropertyOptional({ description: 'Data de início da vigência', nullable: true })
  validFrom!: Date | null;

  @ApiPropertyOptional({ description: 'Data de término da vigência', nullable: true })
  validTo!: Date | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
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
