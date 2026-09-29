import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

const COMPANY_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'] as const;

export class ListCompaniesQueryDto {
  @ApiPropertyOptional({ enum: COMPANY_STATUSES, default: 'PENDING' })
  @IsOptional()
  @IsIn(COMPANY_STATUSES)
  status?: (typeof COMPANY_STATUSES)[number];
}

export class UpdateCompanyStatusDto {
  @ApiProperty({ enum: COMPANY_STATUSES, example: 'ACTIVE' })
  @IsIn(COMPANY_STATUSES)
  status!: (typeof COMPANY_STATUSES)[number];
}

export class CompanyIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  companyId!: string;
}
