import { ApiProperty } from '@nestjs/swagger';

export class TrustSignalsDto {
  @ApiProperty({ description: 'Rating médio >= 4.0 (bem avaliado)' })
  bemAvaliado!: boolean;

  @ApiProperty({ description: 'Preço atualizado nos últimos 7 dias' })
  precoAtualizado!: boolean;

  @ApiProperty({ description: 'Informação de estoque disponível no sistema' })
  estoqueInformado!: boolean;

  @ApiProperty({ description: 'Loja possui pelo menos 1 oferta ativa para este produto' })
  ofertaAtiva!: boolean;

  @ApiProperty({ description: 'Loja possui 3 ou mais avaliações aprovadas' })
  avaliacoesSuficientes!: boolean;

  @ApiProperty({ description: 'Produto/loja criado nos últimos 30 dias' })
  informacaoRecente!: boolean;
}

export interface TrustSignalsInput {
  ratingAverage: number | null;
  ratingCount: number;
  priceUpdatedAt: Date | null;
  hasActiveOffer: boolean;
  createdAt: Date;
}
