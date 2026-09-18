import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiProperty({ description: 'Nova quantidade', example: 50 })
  @IsInt()
  @Min(0)
  quantity!: number;
}
