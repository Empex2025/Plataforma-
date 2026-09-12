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
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: 'product' | 'store';

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  brandName?: string | null;

  @ApiPropertyOptional()
  categoryNames?: string[];

  @ApiPropertyOptional()
  tagNames?: string[];

  @ApiPropertyOptional()
  minPrice?: number | null;

  @ApiPropertyOptional()
  maxPrice?: number | null;

  @ApiPropertyOptional()
  hasStock?: boolean;

  @ApiPropertyOptional()
  ratingAverage?: number | null;

  @ApiProperty()
  reasons!: string[];

  @ApiProperty()
  score!: number;

  @ApiPropertyOptional()
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
  @ApiProperty({ type: [DiscoveryHitDto] })
  hits!: DiscoveryHitDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
