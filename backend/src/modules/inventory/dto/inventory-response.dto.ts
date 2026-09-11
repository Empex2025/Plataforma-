import { ApiProperty } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
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
