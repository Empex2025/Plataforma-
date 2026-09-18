import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateCategoryDto } from '../dto/create-category.dto.js';
import { UpdateCategoryDto } from '../dto/update-category.dto.js';
import { CategoryResponseDto } from '../dto/category-response.dto.js';
import {
  buildSlugLookupWhere,
  resolveUniqueSlug,
} from '@/common/helpers/slug.util.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const slug = await this.resolveSlug(dto.slug, dto.name);

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        icon: dto.icon,
        parentId: dto.parentId,
      },
    });

    return CategoryResponseDto.fromPlain(category);
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
    });

    return categories.map((c) => CategoryResponseDto.fromPlain(c));
  }

  async findById(categoryId: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return CategoryResponseDto.fromPlain(category);
  }

  async findChildren(categoryId: string): Promise<CategoryResponseDto[]> {
    const parent = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!parent) {
      throw new NotFoundException('Category not found');
    }

    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
    });

    return children.map((c) => CategoryResponseDto.fromPlain(c));
  }

  async update(
    categoryId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.parentId) {
      if (dto.parentId === categoryId) {
        throw new ConflictException('Category cannot be its own parent');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = await this.resolveSlug(dto.slug, dto.name, categoryId);
    } else if (dto.slug && dto.slug !== category.slug) {
      slug = await this.resolveSlug(dto.slug, category.name, categoryId);
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(slug !== category.slug && { slug }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });

    return CategoryResponseDto.fromPlain(updated);
  }

  async resolveSlug(
    providedSlug: string | undefined,
    name: string,
    excludeId?: string,
  ): Promise<string> {
    return resolveUniqueSlug({
      providedSlug,
      name,
      excludeId,
      conflictMessage: 'Slug already in use',
      findExisting: (baseSlug) =>
        this.prisma.category.findMany({
          where: buildSlugLookupWhere(baseSlug),
          select: { id: true, slug: true },
        }),
    });
  }
}
