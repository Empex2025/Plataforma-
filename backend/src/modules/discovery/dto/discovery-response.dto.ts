import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DiscoverySignalDto {
  @ApiProperty({
    description: 'Relevância textual do termo de busca (0 a 1). Se não há busca, fica em 0.5.',
  })
  textRelevance!: number;

  @ApiProperty({
    description: 'Disponibilidade em estoque (1 = com estoque; 0.3 = sem estoque/indisponível).',
  })
  availability!: number;

  @ApiProperty({
    description: 'Proximidade geográfica normalizada (0 a 1). Sem localização = 0.5.',
  })
  proximity!: number;

  @ApiProperty({
    description: 'Preço (invertido, menor = melhor). Normalizado 0 a 1.',
  })
  price!: number;

  @ApiProperty({
    description:
      'Popularidade do item (visualizações, engajamento). Valor padrão 0.5 para itens sem histórico.',
  })
  popularity!: number;

  @ApiProperty({
    description: 'Avaliação média (rating), normalizada 0 a 1.',
  })
  rating!: number;

  @ApiProperty({
    description: 'Recência de criação, decaída por meia-vida. Itens mais novos = mais próximos de 1.',
  })
  recency!: number;
}

export class DiscoveryHitDto {
  @ApiProperty({ description: 'Identificador do item' })
  id!: string;

  @ApiProperty({ description: 'Tipo do item' })
  type!: 'product' | 'store';

  @ApiProperty({ description: 'Nome do item' })
  name!: string;

  @ApiProperty({ description: 'Slug do item' })
  slug!: string;

  @ApiPropertyOptional({ description: 'Descrição do item', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ description: 'URL da imagem', nullable: true })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Identificador da empresa (tenant)' })
  companyId!: string;

  @ApiPropertyOptional({ description: 'Nome da marca', nullable: true })
  brandName?: string | null;

  @ApiPropertyOptional({ description: 'Nomes das categorias' })
  categoryNames?: string[];

  @ApiPropertyOptional({ description: 'Nomes das tags' })
  tagNames?: string[];

  @ApiPropertyOptional({ description: 'Preço mínimo', nullable: true })
  minPrice?: number | null;

  @ApiPropertyOptional({ description: 'Preço máximo', nullable: true })
  maxPrice?: number | null;

  @ApiPropertyOptional({ description: 'Disponibilidade em estoque' })
  hasStock?: boolean;

  @ApiPropertyOptional({ description: 'Avaliação média', nullable: true })
  ratingAverage?: number | null;

  @ApiPropertyOptional({ description: 'Número de avaliações aprovadas' })
  ratingCount?: number | null;

  @ApiProperty({ description: 'Motivos da recomendação' })
  reasons!: string[];

  @ApiProperty({ description: 'Pontuação do ranking' })
  score!: number;

  @ApiPropertyOptional({ description: 'Distância em metros', nullable: true })
  distance?: number | null;

  @ApiPropertyOptional({
    type: DiscoverySignalDto,
    description:
      'Interface opcional de sinais que compõem o score. O core do Discovery não é alterado; ' +
      'esta interface apenas expõe os mesmos sinais usados internamente para transparência.',
    required: false,
  })
  signals?: DiscoverySignalDto;
}

export class DiscoveryResponseDto {
  @ApiProperty({ description: 'Itens encontrados', type: [DiscoveryHitDto] })
  hits!: DiscoveryHitDto[];

  @ApiProperty({ description: 'Total de itens' })
  total!: number;

  @ApiProperty({ description: 'Número da página' })
  page!: number;

  @ApiProperty({ description: 'Itens por página' })
  limit!: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages!: number;
}
