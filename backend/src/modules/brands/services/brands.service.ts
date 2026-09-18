import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateBrandDto } from '../dto/create-brand.dto.js';
import { UpdateBrandDto } from '../dto/update-brand.dto.js';
import { BrandResponseDto } from '../dto/brand-response.dto.js';
import {
  buildSlugLookupWhere,
  resolveUniqueSlug,
} from '@/common/helpers/slug.util.js';
import { resolveMembership } from '@/common/helpers/membership.js';

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
    return resolveMembership(this.prisma, companyId, userId);
  }

  async resolveSlug(
    providedSlug: string | undefined,
    name: string,
    companyId: string,
    excludeBrandId?: string,
  ): Promise<string> {
    return resolveUniqueSlug({
      providedSlug,
      name,
      excludeId: excludeBrandId,
      conflictMessage: 'Slug already in use for this company',
      findExisting: (baseSlug) =>
        this.prisma.brand.findMany({
          where: {
            companyId,
            ...buildSlugLookupWhere(baseSlug),
          },
          select: { id: true, slug: true },
        }),
    });
  }
}
