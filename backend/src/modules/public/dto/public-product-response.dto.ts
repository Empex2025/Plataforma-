import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceType } from '@/generated/prisma/enums.js';
import { PublicOfferResponseDto } from './public-offer-response.dto.js';
import { TrustSignalsDto } from './trust-signals.dto.js';

export class PublicProductBrandDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class PublicProductCategoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  icon?: string | null;
}

export class PublicStoreAvailabilityDto {
  @ApiProperty()
  storeId!: string;

  @ApiProperty()
  storeName!: string;

  @ApiProperty()
  storeSlug!: string;

  @ApiProperty({ description: 'Status público da loja: ACTIVE ou CLOSED_TEMPORARY' })
  storeStatus!: string;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  neighborhood?: string | null;

  @ApiPropertyOptional()
  lat?: number | null;

  @ApiPropertyOptional()
  lng?: number | null;

  @ApiPropertyOptional({ description: 'Preço atual (validTo IS NULL). nulo quando indisponível.' })
  price?: number | null;

  @ApiPropertyOptional({ enum: PriceType })
  priceType?: PriceType | null;

  @ApiPropertyOptional({ description: 'Data da última atualização do preço para esta loja' })
  priceUpdatedAt?: Date | null;

  @ApiProperty({
    description:
      'Disponibilidade comercial: a loja está ACTIVE e tem estoque. Lojas CLOSED_TEMPORARY são sempre false.',
  })
  available!: boolean;

  @ApiPropertyOptional({ type: [PublicOfferResponseDto] })
  offers?: PublicOfferResponseDto[];

  @ApiPropertyOptional({ description: 'Distância em metros a partir das coordenadas do consumidor' })
  distance?: number | null;
}

export class PublicProductResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional({ type: PublicProductBrandDto })
  brand?: PublicProductBrandDto | null;

  @ApiPropertyOptional({ type: [PublicProductCategoryDto] })
  categories?: PublicProductCategoryDto[];

  @ApiProperty({ type: [PublicStoreAvailabilityDto] })
  stores!: PublicStoreAvailabilityDto[];

  @ApiPropertyOptional({
    type: [PublicOfferResponseDto],
    description: 'Ofertas da empresa aplicáveis a este produto (storeId IS NULL)',
  })
  offers?: PublicOfferResponseDto[];

  @ApiPropertyOptional({
    description: 'Menor preço atual entre lojas ACTIVE. nulo quando não existe preço.',
  })
  lowestPrice?: number | null;

  @ApiPropertyOptional({
    description: 'Maior preço atual entre lojas ACTIVE. nulo quando não existe preço.',
  })
  highestPrice?: number | null;

  @ApiPropertyOptional({ description: 'Média das avaliações aprovadas (1-5)' })
  ratingAverage?: number | null;

  @ApiProperty({ description: 'Número de avaliações aprovadas' })
  ratingCount!: number;

  @ApiPropertyOptional({
    type: TrustSignalsDto,
    description: 'Sinais de confiança derivados dos dados do produto/loja',
  })
  trustSignals?: TrustSignalsDto;
}
