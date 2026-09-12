import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TagResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  group?: string | null;

  @ApiProperty()
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
