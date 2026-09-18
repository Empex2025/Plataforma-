import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({ description: 'Identificador da marca' })
  id!: string;

  @ApiProperty({ description: 'Identificador da empresa (tenant)' })
  companyId!: string;

  @ApiProperty({ description: 'Nome da marca' })
  name!: string;

  @ApiProperty({ description: 'Slug da marca' })
  slug!: string;

  @ApiPropertyOptional({ description: 'URL do logotipo da marca', nullable: true })
  logoUrl?: string | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
  updatedAt!: Date;

  static fromPlain(brand: {
    id: string;
    companyId: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BrandResponseDto {
    const dto = new BrandResponseDto();
    dto.id = brand.id;
    dto.companyId = brand.companyId;
    dto.name = brand.name;
    dto.slug = brand.slug;
    dto.logoUrl = brand.logoUrl;
    dto.createdAt = brand.createdAt;
    dto.updatedAt = brand.updatedAt;
    return dto;
  }
}
