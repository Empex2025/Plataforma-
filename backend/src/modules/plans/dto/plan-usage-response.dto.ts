import { ApiProperty } from '@nestjs/swagger';

export class PlanUsageResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  planTier!: string;

  @ApiProperty()
  stores!: { current: number; limit: number };

  @ApiProperty()
  products!: { current: number; limit: number };

  @ApiProperty()
  imports!: { current: number; limit: number };

  @ApiProperty()
  members!: { current: number; limit: number };

  @ApiProperty()
  intelligence!: { allowed: boolean };

  @ApiProperty()
  alerts!: { allowed: boolean };
}
