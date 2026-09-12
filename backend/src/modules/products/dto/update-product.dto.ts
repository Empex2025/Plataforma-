import { IsString, IsOptional, IsUUID, Length, Matches, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ProductStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Camiseta Básica V2' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @ApiPropertyOptional({ example: 'camiseta-basica-v2' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Camiseta básica de algodão atualizada' })
  @IsOptional()
  @IsString()
  @Length(0, 5000)
  description?: string;

  @ApiPropertyOptional({ example: 'CAM-002' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  sku?: string;

  @ApiPropertyOptional({ example: '7891234567891' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  barcode?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Brand ID' })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({ enum: ProductStatusDto })
  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto;

  @ApiPropertyOptional({ description: 'Replace all tag associations', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
