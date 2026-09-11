import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional()
  storeId?: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  processed!: number;

  @ApiProperty()
  success!: number;

  @ApiProperty()
  errors!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional()
  finishedAt?: Date | null;

  static fromPlain(job: {
    id: string;
    companyId: string;
    storeId?: string | null;
    type: string;
    status: string;
    fileName: string;
    total: number;
    processed: number;
    success: number;
    errors: number;
    createdAt: Date;
    startedAt?: Date | null;
    finishedAt?: Date | null;
  }): ImportResponseDto {
    const dto = new ImportResponseDto();
    dto.id = job.id;
    dto.companyId = job.companyId;
    dto.storeId = job.storeId ?? null;
    dto.type = job.type;
    dto.status = job.status;
    dto.fileName = job.fileName;
    dto.total = job.total;
    dto.processed = job.processed;
    dto.success = job.success;
    dto.errors = job.errors;
    dto.createdAt = job.createdAt;
    dto.startedAt = job.startedAt ?? null;
    dto.finishedAt = job.finishedAt ?? null;
    return dto;
  }
}
