import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversionResponseDto {
  @ApiProperty({ description: 'Identificador da conversão' })
  id!: string;

  @ApiProperty({ description: 'Identificador da empresa (tenant)' })
  companyId!: string;

  @ApiPropertyOptional({ description: 'Campanha atribuída (nulo quando orgânica)', nullable: true })
  campaignId?: string | null;

  @ApiPropertyOptional({ description: 'Tipo do alvo', nullable: true })
  targetType?: string | null;

  @ApiPropertyOptional({ description: 'Identificador do alvo', nullable: true })
  targetId?: string | null;

  @ApiProperty({ description: 'Valor da receita' })
  revenue!: number;

  @ApiProperty({ description: 'Quantidade de itens' })
  quantity!: number;

  @ApiProperty({ description: 'Código da moeda' })
  currency!: string;

  @ApiProperty({ description: 'Tipo de atribuição' })
  attributionType!: string;

  @ApiProperty({ description: 'Sistema de origem' })
  source!: string;

  @ApiPropertyOptional({ description: 'Referência externa (idempotência)', nullable: true })
  externalRef?: string | null;

  @ApiProperty({ description: 'Data em que a conversão ocorreu' })
  occurredAt!: Date;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): ConversionResponseDto {
    const dto = new ConversionResponseDto();
    dto.id = plain.id as string;
    dto.companyId = plain.companyId as string;
    dto.campaignId = (plain.campaignId as string | null) ?? null;
    dto.targetType = (plain.targetType as string | null) ?? null;
    dto.targetId = (plain.targetId as string | null) ?? null;
    dto.revenue = Number(plain.revenue ?? 0);
    dto.quantity = (plain.quantity as number) ?? 1;
    dto.currency = plain.currency as string;
    dto.attributionType = plain.attributionType as string;
    dto.source = plain.source as string;
    dto.externalRef = (plain.externalRef as string | null) ?? null;
    dto.occurredAt = plain.occurredAt as Date;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
