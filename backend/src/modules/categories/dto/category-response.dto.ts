import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ description: 'Identificador da categoria' })
  id!: string;

  @ApiProperty({ description: 'Nome da categoria' })
  name!: string;

  @ApiProperty({ description: 'Slug da categoria' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Ícone da categoria', nullable: true })
  icon?: string | null;

  @ApiPropertyOptional({ description: 'Identificador da categoria pai', nullable: true })
  parentId?: string | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização do registro' })
  updatedAt!: Date;

  static fromPlain(category: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    parentId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.slug = category.slug;
    dto.icon = category.icon;
    dto.parentId = category.parentId;
    dto.createdAt = category.createdAt;
    dto.updatedAt = category.updatedAt;
    return dto;
  }
}
