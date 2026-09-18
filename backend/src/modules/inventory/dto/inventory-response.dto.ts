import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({ description: 'Identificador do registro de estoque' })
  id!: string;

  @ApiProperty({ description: 'Identificador da loja' })
  storeId!: string;

  @ApiProperty({ description: 'Identificador do produto' })
  productId!: string;

  @ApiProperty({ description: 'Quantidade em estoque' })
  quantity!: number;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
  updatedAt!: Date;

  static fromPlain(inventory: {
    id: string;
    storeId: string;
    productId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryResponseDto {
    const dto = new InventoryResponseDto();
    dto.id = inventory.id;
    dto.storeId = inventory.storeId;
    dto.productId = inventory.productId;
    dto.quantity = inventory.quantity;
    dto.createdAt = inventory.createdAt;
    dto.updatedAt = inventory.updatedAt;
    return dto;
  }
}
