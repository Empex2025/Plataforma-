import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationReasonCode } from '../recommendations.constants.js';

export class RecommendationReasonDto {
  @ApiProperty({ description: 'Código do motivo', enum: RecommendationReasonCode })
  code!: RecommendationReasonCode;

  @ApiProperty({ description: 'Rótulo do motivo' })
  label!: string;
}

export class RecommendationItemDto {
  @ApiProperty({ description: 'Identificador do item' })
  id!: string;

  @ApiProperty({ description: 'Tipo do item', enum: ['product', 'store', 'offer'] })
  type!: 'product' | 'store' | 'offer';

  @ApiProperty({ description: 'Nome do item' })
  name!: string;

  @ApiProperty({ description: 'Slug do item' })
  slug!: string;

  @ApiProperty({ description: 'Identificador da empresa (tenant)' })
  companyId!: string;

  @ApiPropertyOptional({ description: 'URL da imagem', nullable: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({ description: 'Preço mínimo', nullable: true })
  minPrice?: number | null;

  @ApiPropertyOptional({ description: 'Preço máximo', nullable: true })
  maxPrice?: number | null;

  @ApiPropertyOptional({ description: 'Disponibilidade em estoque' })
  hasStock?: boolean;

  @ApiPropertyOptional({ description: 'Avaliação média', nullable: true })
  ratingAverage?: number | null;

  @ApiPropertyOptional({ description: 'Distância em metros', nullable: true })
  distance?: number | null;

  @ApiProperty({ description: 'Motivos da recomendação', type: [RecommendationReasonDto] })
  reasons!: RecommendationReasonDto[];
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Itens recomendados', type: [RecommendationItemDto] })
  items!: RecommendationItemDto[];

  @ApiProperty({ description: 'Total de itens' })
  total!: number;

  @ApiProperty({ description: 'Número da página' })
  page!: number;

  @ApiProperty({ description: 'Itens por página' })
  limit!: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages!: number;
}
