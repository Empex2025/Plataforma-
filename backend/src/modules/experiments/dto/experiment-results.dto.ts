import { ApiProperty } from '@nestjs/swagger';
import { StatisticalAnalysisDto } from './experiment-statistics.dto.js';

export class ExperimentVariantResultDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  allocation!: number;

  @ApiProperty({ description: 'Número de sujeitos atribuídos a esta variante' })
  sampleSize!: number;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  clicks!: number;

  @ApiProperty({ description: 'clicks / impressions * 100, ou nulo quando não há impressões', nullable: true })
  ctr!: number | null;

  @ApiProperty()
  favorites!: number;

  @ApiProperty({ description: 'favorites / impressions * 100, ou nulo', nullable: true })
  favoriteRate!: number | null;

  @ApiProperty()
  contacts!: number;

  @ApiProperty({ description: 'contacts / impressions * 100, ou nulo', nullable: true })
  contactRate!: number | null;
}

export class ExperimentResultsDto {
  @ApiProperty()
  experiment!: {
    id: string;
    key: string;
    domain: string;
    name: string;
    status: string;
    startAt: Date | null;
    endAt: Date | null;
  };

  @ApiProperty()
  period!: { start: string; end: string };

  @ApiProperty({ type: [ExperimentVariantResultDto] })
  variants!: ExperimentVariantResultDto[];

  @ApiProperty({ type: StatisticalAnalysisDto })
  statisticalAnalysis!: StatisticalAnalysisDto;

  @ApiProperty({ description: 'Métricas observadas com contexto estatístico. Nenhum vencedor é declarado.' })
  significance!: { computed: boolean; note: string };
}
