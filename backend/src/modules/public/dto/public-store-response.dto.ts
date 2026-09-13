import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrustSignalsDto } from './trust-signals.dto.js';

export class PublicStoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiPropertyOptional()
  whatsapp?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  addressNum?: string | null;

  @ApiPropertyOptional()
  complement?: string | null;

  @ApiPropertyOptional()
  neighborhood?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  zipCode?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  lat?: number | null;

  @ApiPropertyOptional()
  lng?: number | null;

  @ApiProperty({ description: 'Public store status: ACTIVE or CLOSED_TEMPORARY' })
  status!: string;

  @ApiPropertyOptional()
  companyName?: string | null;

  @ApiProperty()
  productCount!: number;

  @ApiProperty()
  activeOfferCount!: number;

  @ApiPropertyOptional({ description: 'Average rating from approved reviews (1-5)' })
  ratingAverage?: number | null;

  @ApiProperty({ description: 'Number of approved reviews' })
  ratingCount!: number;

  @ApiPropertyOptional({
    type: TrustSignalsDto,
    description: 'Sinais de confiança derivados dos dados da loja',
  })
  trustSignals?: TrustSignalsDto;

  static fromPlain(store: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
    addressNum?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    country?: string | null;
    lat?: number | null;
    lng?: number | null;
    status: string;
    companyName?: string | null;
    productCount: number;
    activeOfferCount: number;
    ratingAverage?: number | null;
    ratingCount?: number;
  }): PublicStoreResponseDto {
    const dto = new PublicStoreResponseDto();
    dto.id = store.id;
    dto.name = store.name;
    dto.slug = store.slug;
    dto.description = store.description ?? null;
    dto.phone = store.phone ?? null;
    dto.whatsapp = store.whatsapp ?? null;
    dto.email = store.email ?? null;
    dto.address = store.address ?? null;
    dto.addressNum = store.addressNum ?? null;
    dto.complement = store.complement ?? null;
    dto.neighborhood = store.neighborhood ?? null;
    dto.city = store.city ?? null;
    dto.state = store.state ?? null;
    dto.zipCode = store.zipCode ?? null;
    dto.country = store.country ?? null;
    dto.lat = store.lat ?? null;
    dto.lng = store.lng ?? null;
    dto.status = store.status;
    dto.companyName = store.companyName ?? null;
    dto.productCount = store.productCount;
    dto.activeOfferCount = store.activeOfferCount;
    dto.ratingAverage = store.ratingAverage ?? null;
    dto.ratingCount = store.ratingCount ?? 0;
    return dto;
  }
}

export class PublicStoreCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  productCount!: number;
}

export class PublicStoreCategoriesResponseDto {
  @ApiProperty({ type: [PublicStoreCategoryDto] })
  categories!: PublicStoreCategoryDto[];
}
