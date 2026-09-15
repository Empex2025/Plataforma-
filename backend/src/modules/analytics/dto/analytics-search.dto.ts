export class AnalyticsSearchTermDto {
  query!: string;
  count!: number;
}

export class AnalyticsSearchDto {
  period!: { start: string; end: string };
  topSearches!: AnalyticsSearchTermDto[];
  emptyResultSearches!: AnalyticsSearchTermDto[];
  totalSearches!: number;
  uniqueSearchTerms!: number;
}
