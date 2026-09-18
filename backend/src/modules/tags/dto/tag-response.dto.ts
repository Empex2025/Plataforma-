import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty({ description: 'Identificador da tag' })
  id!: string;

  @ApiProperty({ description: 'Nome da tag' })
  name!: string;

  @ApiProperty({ description: 'Slug da tag' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Grupo da tag', nullable: true })
  group?: string | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  static fromPlain(tag: {
    id: string;
    name: string;
    slug: string;
    group: string | null;
    createdAt: Date;
  }): TagResponseDto {
    const dto = new TagResponseDto();
    dto.id = tag.id;
    dto.name = tag.name;
    dto.slug = tag.slug;
    dto.group = tag.group;
    dto.createdAt = tag.createdAt;
    return dto;
  }
}
