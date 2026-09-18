import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { resolveMembership } from '@/common/helpers/membership.js';
import { CreateCompanyDto } from '../dto/create-company.dto.js';
import { UpdateCompanyDto } from '../dto/update-company.dto.js';
import { CompanyResponseDto } from '../dto/company-response.dto.js';
import { UserRole } from '@/generated/prisma/enums.js';
import {
  buildSlugLookupWhere,
  resolveUniqueSlug,
} from '@/common/helpers/slug.util.js';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCompanyDto): Promise<{ company: CompanyResponseDto; membership: { role: string; createdAt: Date } }> {
    const slug = await this.resolveSlug(dto.slug, dto.name);

    if (dto.cnpj) {
      const existingCnpj = await this.prisma.company.findUnique({
        where: { cnpj: dto.cnpj },
      });
      if (existingCnpj) {
        throw new ConflictException('CNPJ already registered');
      }
    }

    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        slug,
        cnpj: dto.cnpj,
        description: dto.description,
        status: 'PENDING',
        users: {
          create: {
            userId,
            role: UserRole.MERCHANT_OWNER,
          },
        },
      },
      include: {
        users: {
          select: { role: true, createdAt: true },
          where: { userId },
          take: 1,
        },
      },
    });

    const membership = company.users[0];

    return {
      company: CompanyResponseDto.fromPlain(company),
      membership: { role: membership.role, createdAt: membership.createdAt },
    };
  }

  async findById(companyId: string, userId: string): Promise<CompanyResponseDto> {
    await this.validateMembership(companyId, userId);

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    return CompanyResponseDto.fromPlain(company);
  }

  async findBySlug(slug: string, userId: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { slug },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    await this.validateMembership(company.id, userId);

    return CompanyResponseDto.fromPlain(company);
  }

  async listByUser(userId: string): Promise<Array<{ company: CompanyResponseDto; role: string }>> {
    const memberships = await this.prisma.userCompany.findMany({
      where: { userId },
      include: { company: true },
    });

    return memberships
      .filter((m) => m.company && !m.company.deletedAt)
      .map((m) => ({
        company: CompanyResponseDto.fromPlain(m.company),
        role: m.role,
      }));
  }

  async update(
    companyId: string,
    userId: string,
    dto: UpdateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const membership = await this.validateMembership(companyId, userId);

    if (membership.role !== UserRole.MERCHANT_OWNER) {
      throw new ForbiddenException('Only company owner can update company');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || company.deletedAt) {
      throw new NotFoundException('Company not found');
    }

    if (dto.name && dto.name !== company.name) {
      const newSlug = await this.resolveSlug(undefined, dto.name, companyId);
      const updated = await this.prisma.company.update({
        where: { id: companyId },
        data: {
          name: dto.name,
          slug: newSlug,
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        },
      });
      return CompanyResponseDto.fromPlain(updated);
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    });

    return CompanyResponseDto.fromPlain(updated);
  }

  private async validateMembership(companyId: string, userId: string) {
    return resolveMembership(this.prisma, companyId, userId);
  }

  async resolveSlug(
    providedSlug: string | undefined,
    name: string,
    excludeCompanyId?: string,
  ): Promise<string> {
    return resolveUniqueSlug({
      providedSlug,
      name,
      excludeId: excludeCompanyId,
      conflictMessage: 'Slug already in use',
      findExisting: (baseSlug) =>
        this.prisma.company.findMany({
          where: buildSlugLookupWhere(baseSlug),
          select: { id: true, slug: true },
        }),
    });
  }
}

