import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportResponseDto {
  @ApiProperty({ description: 'Identificador da importação' })
  id!: string;

  @ApiProperty({ description: 'Identificador da empresa (tenant)' })
  companyId!: string;

  @ApiPropertyOptional({ description: 'Identificador da loja associada', nullable: true })
  storeId?: string | null;

  @ApiProperty({ description: 'Tipo da importação' })
  type!: string;

  @ApiProperty({ description: 'Status da importação' })
  status!: string;

  @ApiProperty({ description: 'Nome do arquivo enviado' })
  fileName!: string;

  @ApiProperty({ description: 'Total de linhas' })
  total!: number;

  @ApiProperty({ description: 'Total de linhas processadas' })
  processed!: number;

  @ApiProperty({ description: 'Total de linhas importadas com sucesso' })
  success!: number;

  @ApiProperty({ description: 'Total de linhas com erro' })
  errors!: number;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'Data de início do processamento', nullable: true })
  startedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Data de conclusão do processamento', nullable: true })
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
