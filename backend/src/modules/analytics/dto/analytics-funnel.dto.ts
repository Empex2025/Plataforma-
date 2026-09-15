export class AnalyticsFunnelStageDto {
  stage!: string;
  count!: number;
  conversionFromPrevious!: number | null;
}

export class AnalyticsFunnelDto {
  period!: { start: string; end: string };
  stages!: AnalyticsFunnelStageDto[];
  disclaimer!: 'HEURISTICO_NAO_DEFINITIVO';
}
