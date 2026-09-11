import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyPlanResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  plan!: {
    id: string;
    name: string;
    tier: string;
    maxStores: number;
    maxProducts: number;
    maxImports: number;
    maxMembers: number;
    analytics: boolean;
    alerts: boolean;
  };

  @ApiProperty()
  startsAt!: Date;

  @ApiPropertyOptional()
  endsAt?: Date | null;

  static fromPlain(plain: Record<string, unknown>): CompanyPlanResponseDto {
    const dto = new CompanyPlanResponseDto();
    dto.companyId = plain.companyId as string;
    dto.plan = plain.plan as CompanyPlanResponseDto['plan'];
    dto.startsAt = plain.startsAt as Date;
    dto.endsAt = plain.endsAt as Date | null;
    return dto;
  }
}
