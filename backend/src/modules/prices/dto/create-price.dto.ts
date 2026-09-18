import { IsUUID, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '@/generated/prisma/enums.js';

export class CreatePriceDto {
  @ApiProperty({ description: 'ID da loja' })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ description: 'ID do produto' })
  @IsUUID()
  productId!: string;

  @ApiPropertyOptional({ enum: PriceType, default: PriceType.REGULAR })
  @IsOptional()
  @IsEnum(PriceType)
  type?: PriceType;

  @ApiProperty({ description: 'Valor do preço', example: 29.90 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  value!: number;

  @ApiPropertyOptional({ description: 'Data de início da vigência do preço' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Data de término da vigência do preço' })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
