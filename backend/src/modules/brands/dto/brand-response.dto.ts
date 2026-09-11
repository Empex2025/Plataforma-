import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
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
