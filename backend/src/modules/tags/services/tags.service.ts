import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateTagDto } from '../dto/create-tag.dto.js';
import { TagResponseDto } from '../dto/tag-response.dto.js';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTagDto): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Slug de tag já existe');
    }

    const tag = await this.prisma.tag.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        group: dto.group ?? null,
      },
    });

    return TagResponseDto.fromPlain(tag);
  }

  async findBySlug(slug: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({ where: { slug } });
    if (!tag) throw new NotFoundException('Tag não encontrada');
    return TagResponseDto.fromPlain(tag);
  }

  async findById(id: string): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag não encontrada');
    return TagResponseDto.fromPlain(tag);
  }

  async list(group?: string): Promise<TagResponseDto[]> {
    const where = group ? { group } : {};
    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return tags.map((t) => TagResponseDto.fromPlain(t));
  }

  async findOrCreate(name: string, slug: string, group?: string): Promise<TagResponseDto> {
    const existing = await this.prisma.tag.findUnique({ where: { slug } });
    if (existing) return TagResponseDto.fromPlain(existing);
    return this.create({ name, slug, group });
  }
}
