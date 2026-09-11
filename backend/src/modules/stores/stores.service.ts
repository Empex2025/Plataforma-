import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';
import { StoreResponseDto } from './dto/store-response.dto.js';
import { GeoHelper } from '../../common/helpers/geo.helper.js';
import { SearchIndexQueue } from '../search/search-index-queue.js';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateStoreDto,
  ): Promise<StoreResponseDto> {
    await this.validateMembership(companyId, userId);

    const slug = await this.resolveStoreSlug(dto.slug, dto.name, companyId);

    const point = GeoHelper.makePoint(dto.lng, dto.lat);

    await this.prisma.$executeRaw`
      INSERT INTO stores (id, company_id, name, slug, description, phone, whatsapp, email,
        address, address_num, complement, neighborhood, city, state, zip_code, country,
        location, status, created_at, updated_at)
      VALUES (
        gen_random_uuid()::uuid,
        ${companyId}::uuid,
        ${dto.name},
        ${slug},
        ${dto.description ?? null},
        ${dto.phone ?? null},
        ${dto.whatsapp ?? null},
        ${dto.email ?? null},
        ${dto.address ?? null},
        ${dto.addressNum ?? null},
        ${dto.complement ?? null},
        ${dto.neighborhood ?? null},
        ${dto.city ?? null},
        ${dto.state ?? null},
        ${dto.zipCode ?? null},
        ${dto.country ?? 'BR'},
        ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography,
        'ACTIVE',
        NOW(),
        NOW()
      )
    `;

    const created = await this.prisma.$queryRaw<Array<{
      id: string;
      company_id: string;
      name: string;
      slug: string;
      description: string | null;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      address: string | null;
      address_num: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      country: string;
      lat: number;
      lng: number;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT id, company_id, name, slug, description, phone, whatsapp, email,
        address, address_num, complement, neighborhood, city, state, zip_code, country,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        status, created_at, updated_at
      FROM stores
      WHERE company_id = ${companyId}::uuid AND slug = ${slug}
      LIMIT 1
    `;

    if (!created.length) {
      throw new Error('Failed to retrieve created store');
    }

    const row = created[0];

    await this.searchIndexQueue.indexStore(row.id);

    return StoreResponseDto.fromPlain({
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      address: row.address,
      addressNum: row.address_num,
      complement: row.complement,
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      country: row.country,
      lat: row.lat,
      lng: row.lng,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(
    companyId: string,
    storeId: string,
    userId: string,
  ): Promise<StoreResponseDto> {
    await this.validateMembership(companyId, userId);

    const stores = await this.prisma.$queryRaw<Array<{
      id: string;
      company_id: string;
      name: string;
      slug: string;
      description: string | null;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      address: string | null;
      address_num: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      country: string;
      lat: number;
      lng: number;
      status: string;
      deleted_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT id, company_id, name, slug, description, phone, whatsapp, email,
        address, address_num, complement, neighborhood, city, state, zip_code, country,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        status, deleted_at, created_at, updated_at
      FROM stores
      WHERE id = ${storeId}::uuid AND company_id = ${companyId}::uuid
      LIMIT 1
    `;

    if (!stores.length || stores[0].deleted_at) {
      throw new NotFoundException('Store not found');
    }

    const row = stores[0];

    return StoreResponseDto.fromPlain({
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      phone: row.phone,
      whatsapp: row.whatsapp,
      email: row.email,
      address: row.address,
      addressNum: row.address_num,
      complement: row.complement,
      neighborhood: row.neighborhood,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      country: row.country,
      lat: row.lat,
      lng: row.lng,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async listByCompany(
    companyId: string,
    userId: string,
  ): Promise<StoreResponseDto[]> {
    await this.validateMembership(companyId, userId);

    const stores = await this.prisma.$queryRaw<Array<{
      id: string;
      company_id: string;
      name: string;
      slug: string;
      description: string | null;
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      address: string | null;
      address_num: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      zip_code: string | null;
      country: string;
      lat: number;
      lng: number;
      status: string;
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT id, company_id, name, slug, description, phone, whatsapp, email,
        address, address_num, complement, neighborhood, city, state, zip_code, country,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lng,
        status, created_at, updated_at
      FROM stores
      WHERE company_id = ${companyId}::uuid AND deleted_at IS NULL
      ORDER BY created_at ASC
    `;

    return stores.map((row) =>
      StoreResponseDto.fromPlain({
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        phone: row.phone,
        whatsapp: row.whatsapp,
        email: row.email,
        address: row.address,
        addressNum: row.address_num,
        complement: row.complement,
        neighborhood: row.neighborhood,
        city: row.city,
        state: row.state,
        zipCode: row.zip_code,
        country: row.country,
        lat: row.lat,
        lng: row.lng,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );
  }

  async update(
    companyId: string,
    storeId: string,
    userId: string,
    dto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    await this.validateMembership(companyId, userId);

    const existing = await this.prisma.$queryRaw<Array<{ id: string; deleted_at: Date | null }>>`
      SELECT id, deleted_at FROM stores WHERE id = ${storeId}::uuid AND company_id = ${companyId}::uuid
    `;

    if (!existing.length || existing[0].deleted_at) {
      throw new NotFoundException('Store not found');
    }

    let locationClause = '';
    if (dto.lat !== undefined && dto.lng !== undefined) {
      const point = GeoHelper.makePoint(dto.lng, dto.lat);
      locationClause = `location = ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography,`;
    }

    await this.prisma.$executeRaw`
      UPDATE stores SET
        name = COALESCE(${dto.name ?? null}, name),
        description = COALESCE(${dto.description ?? null}, description),
        phone = COALESCE(${dto.phone ?? null}, phone),
        whatsapp = COALESCE(${dto.whatsapp ?? null}, whatsapp),
        email = COALESCE(${dto.email ?? null}, email),
        address = COALESCE(${dto.address ?? null}, address),
        address_num = COALESCE(${dto.addressNum ?? null}, address_num),
        complement = COALESCE(${dto.complement ?? null}, complement),
        neighborhood = COALESCE(${dto.neighborhood ?? null}, neighborhood),
        city = COALESCE(${dto.city ?? null}, city),
        state = COALESCE(${dto.state ?? null}, state),
        zip_code = COALESCE(${dto.zipCode ?? null}, zip_code),
        updated_at = NOW()
      WHERE id = ${storeId}::uuid AND company_id = ${companyId}::uuid
    `;

    if (locationClause) {
      const point = GeoHelper.makePoint(dto.lng!, dto.lat!);
      await this.prisma.$executeRaw`
        UPDATE stores SET
          location = ST_SetSRID(ST_GeomFromText(${point}), 4326)::geography
        WHERE id = ${storeId}::uuid AND company_id = ${companyId}::uuid
      `;
    }

    await this.searchIndexQueue.indexStore(storeId);

    return this.findById(companyId, storeId, userId);
  }

  async deactivate(
    companyId: string,
    storeId: string,
    userId: string,
  ): Promise<void> {
    await this.validateMembership(companyId, userId);

    const existing = await this.prisma.$queryRaw<Array<{ id: string; deleted_at: Date | null }>>`
      SELECT id, deleted_at FROM stores WHERE id = ${storeId}::uuid AND company_id = ${companyId}::uuid
    `;

    if (!existing.length || existing[0].deleted_at) {
      throw new NotFoundException('Store not found');
    }

    await this.prisma.$executeRaw`
      UPDATE stores SET status = 'INACTIVE', deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${storeId}::uuid AND company_id = ${companyId}::uuid
    `;

    await this.searchIndexQueue.removeStore(storeId);
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

  async resolveStoreSlug(
    providedSlug: string | undefined,
    name: string,
    companyId: string,
  ): Promise<string> {
    const baseSlug = providedSlug
      ? this.normalizeSlug(providedSlug)
      : this.normalizeSlug(name);

    if (!baseSlug) {
      throw new ConflictException('Could not generate a valid slug');
    }

    const existing = await this.prisma.$queryRaw<Array<{ slug: string }>>`
      SELECT slug FROM stores
      WHERE slug = ${baseSlug} AND company_id = ${companyId}::uuid AND deleted_at IS NULL
      LIMIT 1
    `;

    if (!existing.length) {
      return baseSlug;
    }

    if (providedSlug) {
      throw new ConflictException('Slug already in use for this company');
    }

    for (let i = 2; i <= 1000; i++) {
      const candidate = `${baseSlug}-${i}`;
      const exists = await this.prisma.$queryRaw<Array<{ slug: string }>>`
        SELECT slug FROM stores
        WHERE slug = ${candidate} AND company_id = ${companyId}::uuid AND deleted_at IS NULL
        LIMIT 1
      `;
      if (!exists.length) {
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
