import { ApiProperty } from '@nestjs/swagger';

export class ExperimentVariantResultDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  allocation!: number;

  @ApiProperty({ description: 'Number of subjects assigned to this variant' })
  sampleSize!: number;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  clicks!: number;

  @ApiProperty({ description: 'clicks / impressions * 100, or null when there are no impressions', nullable: true })
  ctr!: number | null;

  @ApiProperty()
  favorites!: number;

  @ApiProperty({ description: 'favorites / impressions * 100, or null', nullable: true })
  favoriteRate!: number | null;

  @ApiProperty()
  contacts!: number;

  @ApiProperty({ description: 'contacts / impressions * 100, or null', nullable: true })
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

  @ApiProperty({ description: 'Observed metrics only. No statistical significance or winner is computed.' })
  significance!: { computed: boolean; note: string };
}
