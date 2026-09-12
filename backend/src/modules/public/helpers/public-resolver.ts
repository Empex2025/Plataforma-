import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';

export interface PublicCompanyRecord {
  id: string;
  name: string;
  slug: string;
}

export interface PublicProductRecord {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  brand: { id: string; name: string; slug: string } | null;
  categories: Array<{ id: string; name: string; slug: string; icon: string | null }>;
  ratingAverage: number | null;
  ratingCount: number;
}

export interface PublicStoreRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  addressNum: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  ratingAverage: number | null;
  ratingCount: number;
}

export async function resolvePublicCompany(
  prisma: PrismaService,
  companySlug: string,
): Promise<PublicCompanyRecord> {
  const company = await prisma.company.findFirst({
    where: { slug: companySlug, status: 'ACTIVE', deletedAt: null },
    select: { id: true, name: true, slug: true },
  });

  if (!company) {
    throw new NotFoundException('Company not found');
  }

  return company;
}

export async function resolvePublicProduct(
  prisma: PrismaService,
  companyId: string,
  productSlug: string,
): Promise<PublicProductRecord> {
  const product = await prisma.product.findFirst({
    where: { companyId, slug: productSlug, status: 'ACTIVE', deletedAt: null },
    select: {
      id: true,
      companyId: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      ratingAverage: true,
      ratingCount: true,
      brand: { select: { id: true, name: true, slug: true } },
      categories: {
        select: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
        },
      },
    },
  });

  if (!product) {
    throw new NotFoundException('Product not found');
  }

  return {
    id: product.id,
    companyId: product.companyId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    imageUrl: product.imageUrl,
    brand: product.brand ?? null,
    categories: product.categories.map((pc) => pc.category),
    ratingAverage: product.ratingAverage != null ? Number(product.ratingAverage) : null,
    ratingCount: product.ratingCount,
  };
}

export async function resolvePublicStore(
  prisma: PrismaService,
  companyId: string,
  storeSlug: string,
): Promise<PublicStoreRecord> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
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
      country: string | null;
      lat: number | null;
      lng: number | null;
      status: string;
      rating_average: number | null;
      rating_count: number;
    }>
  >`
    SELECT
      id, name, slug, description, phone, whatsapp, email,
      address, address_num, complement, neighborhood, city, state, zip_code, country,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      status,
      rating_average, rating_count
    FROM stores
    WHERE company_id = ${companyId}::uuid
      AND slug = ${storeSlug}
      AND deleted_at IS NULL
      AND status <> 'INACTIVE'
    LIMIT 1
  `;

  if (!rows.length) {
    throw new NotFoundException('Store not found');
  }

  const row = rows[0];

  return {
    id: row.id,
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
    ratingAverage: row.rating_average != null ? Number(row.rating_average) : null,
    ratingCount: row.rating_count,
  };
}
