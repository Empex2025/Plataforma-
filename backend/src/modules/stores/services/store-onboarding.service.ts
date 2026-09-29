import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { StoreOnboardingDto } from '../dto/store-onboarding.dto.js';
import {
  StoreHourResponseDto,
  StoreResponseDto,
} from '../dto/store-response.dto.js';
import { StoresService } from './stores.service.js';

@Injectable()
export class StoreOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  async create(
    userId: string,
    dto: StoreOnboardingDto,
  ): Promise<StoreResponseDto> {
    const companyId = await this.resolveCompanyId(userId);
    const { city, state } = this.splitCityState(dto.cityState);

    const store = await this.storesService.create(companyId, userId, {
      name: dto.name,
      zipCode: dto.zipCode,
      address: dto.address,
      complement: dto.complement,
      city,
      state,
      phone: dto.phone,
      whatsapp: dto.whatsapp,
      country: 'BR',
      lat: dto.lat,
      lng: dto.lng,
    });

    if (dto.logoUrl || dto.coverUrl || dto.instagram) {
      await this.prisma.store.update({
        where: { id: store.id },
        data: {
          logoUrl: dto.logoUrl ?? null,
          coverUrl: dto.coverUrl ?? null,
          instagram: dto.instagram ?? null,
        },
      });

      store.logoUrl = dto.logoUrl ?? null;
      store.coverUrl = dto.coverUrl ?? null;
      store.instagram = dto.instagram ?? null;
    }

    if (dto.hours?.length) {
      await this.prisma.storeHour.createMany({
        data: dto.hours.map((hour) => ({
          storeId: store.id,
          days: hour.days,
          start: hour.start,
          end: hour.end,
        })),
      });

      store.hours = dto.hours.map((hour) =>
        StoreHourResponseDto.fromPlain(hour),
      );
    }

    return store;
  }

  private async resolveCompanyId(userId: string): Promise<string> {
    const existing = await this.prisma.userCompany.findFirst({
      where: { userId },
    });
    if (existing) return existing.companyId;

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const name = user.name ?? 'Minha Empresa';

    const company = await this.prisma.company.create({
      data: {
        name,
        slug: await this.uniqueSlug(name),
        cnpj: user.personType === 'PJ' ? (user.document ?? null) : null,
        status: 'PENDING',
      },
    });

    await this.prisma.userCompany.create({
      data: { userId, companyId: company.id, role: 'MERCHANT_OWNER' },
    });

    return company.id;
  }

  private splitCityState(value?: string): { city?: string; state?: string } {
    if (!value) return {};

    const [city, state] = value.split(/\s*[-,/]\s*/);
    return {
      city: city?.trim() || undefined,
      state: state?.trim() || undefined,
    };
  }

  private async uniqueSlug(base: string): Promise<string> {
    const root =
      base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'empresa';

    let candidate = root;
    let suffix = 1;

    while (await this.prisma.company.findUnique({ where: { slug: candidate } })) {
      candidate = `${root}-${suffix++}`;
    }

    return candidate;
  }
}
