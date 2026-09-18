import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ description: 'Identificador do produto' })
  id!: string;

  @ApiProperty({ description: 'Identificador da empresa (tenant)' })
  companyId!: string;

  @ApiPropertyOptional({ description: 'Identificador da marca', nullable: true })
  brandId?: string | null;

  @ApiProperty({ description: 'Nome do produto' })
  name!: string;

  @ApiProperty({ description: 'Slug do produto' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Descrição do produto', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ description: 'SKU do produto', nullable: true })
  sku?: string | null;

  @ApiPropertyOptional({ description: 'Código de barras do produto', nullable: true })
  barcode?: string | null;

  @ApiPropertyOptional({ description: 'URL da imagem do produto', nullable: true })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Status do produto' })
  status!: string;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
  updatedAt!: Date;

  static fromPlain(product: {
    id: string;
    companyId: string;
    brandId?: string | null;
    name: string;
    slug: string;
    description?: string | null;
    sku?: string | null;
    barcode?: string | null;
    imageUrl?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.companyId = product.companyId;
    dto.brandId = product.brandId ?? null;
    dto.name = product.name;
    dto.slug = product.slug;
    dto.description = product.description ?? null;
    dto.sku = product.sku ?? null;
    dto.barcode = product.barcode ?? null;
    dto.imageUrl = product.imageUrl ?? null;
    dto.status = product.status;
    dto.createdAt = product.createdAt;
    dto.updatedAt = product.updatedAt;
    return dto;
  }
}
