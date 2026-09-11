import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiProperty({ description: 'New quantity', example: 50 })
  @IsInt()
  @Min(0)
  quantity!: number;
}
