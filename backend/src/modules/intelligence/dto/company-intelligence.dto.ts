import { ApiProperty } from '@nestjs/swagger';

export class TopEntityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  revenue?: number;
}

export class CompanyIntelligenceDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty({ type: [TopEntityDto] })
  topProducts!: TopEntityDto[];

  @ApiProperty({ type: [TopEntityDto] })
  topStores!: TopEntityDto[];

  @ApiProperty()
  demandGap!: {
    totalViews: number;
    totalContacts: number;
    conversionRate: number;
  };

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;
}
