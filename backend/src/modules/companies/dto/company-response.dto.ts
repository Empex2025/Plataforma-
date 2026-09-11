import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  cnpj?: string | null;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(company: {
    id: string;
    name: string;
    slug: string;
    cnpj?: string | null;
    description?: string | null;
    logoUrl?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): CompanyResponseDto {
    const dto = new CompanyResponseDto();
    dto.id = company.id;
    dto.name = company.name;
    dto.slug = company.slug;
    dto.cnpj = company.cnpj;
    dto.description = company.description;
    dto.logoUrl = company.logoUrl;
    dto.status = company.status;
    dto.createdAt = company.createdAt;
    dto.updatedAt = company.updatedAt;
    return dto;
  }
}
