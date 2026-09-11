import { IsUUID, IsInt, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ description: 'Store UUID' })
  @IsUUID()
  @IsNotEmpty()
  storeId!: string;

  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Quantity in stock', example: 100 })
  @IsInt()
  @Min(0)
  quantity!: number;
}
