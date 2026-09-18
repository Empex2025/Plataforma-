import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ description: 'Identificador da empresa' })
  id!: string;

  @ApiProperty({ description: 'Nome da empresa' })
  name!: string;

  @ApiProperty({ description: 'Slug da empresa' })
  slug!: string;

  @ApiPropertyOptional({ description: 'CNPJ da empresa', nullable: true })
  cnpj?: string | null;

  @ApiPropertyOptional({ description: 'Descrição da empresa', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ description: 'URL do logotipo da empresa', nullable: true })
  logoUrl?: string | null;

  @ApiProperty({ description: 'Situação da empresa' })
  status!: string;

  @ApiProperty({ description: 'Data de criação da empresa' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização da empresa' })
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
