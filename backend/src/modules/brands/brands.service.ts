import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { CreateBrandDto } from './dto/create-brand.dto.js';
import { UpdateBrandDto } from './dto/update-brand.dto.js';
import { BrandResponseDto } from './dto/brand-response.dto.js';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateBrandDto,
  ): Promise<BrandResponseDto> {
    await this.validateMembership(companyId, userId);

    const slug = await this.resolveSlug(dto.slug, dto.name, companyId);

    const brand = await this.prisma.brand.create({
      data: {
        companyId,
        name: dto.name,
        slug,
        logoUrl: dto.logoUrl,
      },
    });

    return BrandResponseDto.fromPlain(brand);
  }

  async listByCompany(
    companyId: string,
    userId: string,
  ): Promise<BrandResponseDto[]> {
    await this.validateMembership(companyId, userId);

    const brands = await this.prisma.brand.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });

    return brands.map((brand) => BrandResponseDto.fromPlain(brand));
  }

  async findById(
    companyId: string,
    brandId: string,
    userId: string,
  ): Promise<BrandResponseDto> {
    await this.validateMembership(companyId, userId);

    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, companyId },
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return BrandResponseDto.fromPlain(brand);
  }

  async update(
    companyId: string,
    brandId: string,
    userId: string,
    dto: UpdateBrandDto,
  ): Promise<BrandResponseDto> {
    await this.validateMembership(companyId, userId);

    const existing = await this.prisma.brand.findFirst({
      where: { id: brandId, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Brand not found');
    }

    await this.prisma.brand.update({
      where: { id: brandId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });

    const updated = await this.prisma.brand.findUnique({
      where: { id: brandId },
    });

    return BrandResponseDto.fromPlain(updated!);
  }

  private async validateMembership(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }

    return userCompany;
  }

  async resolveSlug(
    providedSlug: string | undefined,
    name: string,
    companyId: string,
    excludeBrandId?: string,
  ): Promise<string> {
    const baseSlug = providedSlug
      ? this.normalizeSlug(providedSlug)
      : this.normalizeSlug(name);

    if (!baseSlug) {
      throw new ConflictException('Could not generate a valid slug');
    }

    const existing = await this.prisma.brand.findUnique({
      where: { companyId_slug: { companyId, slug: baseSlug } },
      select: { id: true },
    });

    if (!existing || (excludeBrandId && existing.id === excludeBrandId)) {
      return baseSlug;
    }

    if (providedSlug) {
      throw new ConflictException('Slug already in use for this company');
    }

    for (let i = 2; i <= 1000; i++) {
      const candidate = `${baseSlug}-${i}`;
      const exists = await this.prisma.brand.findUnique({
        where: { companyId_slug: { companyId, slug: candidate } },
        select: { id: true },
      });
      if (!exists || (excludeBrandId && exists.id === excludeBrandId)) {
        return candidate;
      }
    }

    throw new ConflictException('Could not generate a unique slug');
  }

  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
