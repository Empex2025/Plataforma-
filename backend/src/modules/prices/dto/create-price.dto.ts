import { IsUUID, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '../../../generated/prisma/enums.js';

export class CreatePriceDto {
  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ description: 'Product ID' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ enum: PriceType, default: PriceType.REGULAR })
  @IsOptional()
  @IsEnum(PriceType)
  type?: PriceType;

  @ApiProperty({ description: 'Price value', example: 29.90 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  value!: number;

  @ApiPropertyOptional({ description: 'Price valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Price valid to date' })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
