import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

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

  @ApiProperty()
  country!: string;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(store: {
    id: string;
    companyId: string;
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
    country: string;
    lat?: number | null;
    lng?: number | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): StoreResponseDto {
    const dto = new StoreResponseDto();
    dto.id = store.id;
    dto.companyId = store.companyId;
    dto.name = store.name;
    dto.slug = store.slug;
    dto.description = store.description;
    dto.phone = store.phone;
    dto.whatsapp = store.whatsapp;
    dto.email = store.email;
    dto.address = store.address;
    dto.addressNum = store.addressNum;
    dto.complement = store.complement;
    dto.neighborhood = store.neighborhood;
    dto.city = store.city;
    dto.state = store.state;
    dto.zipCode = store.zipCode;
    dto.country = store.country;
    dto.lat = store.lat ?? 0;
    dto.lng = store.lng ?? 0;
    dto.status = store.status;
    dto.createdAt = store.createdAt;
    dto.updatedAt = store.updatedAt;
    return dto;
  }
}
