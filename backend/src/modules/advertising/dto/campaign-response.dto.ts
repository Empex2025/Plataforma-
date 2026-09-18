import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SponsoredItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  targetId!: string;

  @ApiProperty()
  weight!: number;

  @ApiProperty()
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): SponsoredItemResponseDto {
    const dto = new SponsoredItemResponseDto();
    dto.id = plain.id as string;
    dto.targetType = plain.targetType as string;
    dto.targetId = plain.targetId as string;
    dto.weight = plain.weight as number;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}

export class CampaignResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  startAt?: Date | null;

  @ApiPropertyOptional()
  endAt?: Date | null;

  @ApiPropertyOptional()
  budget?: number | null;

  @ApiProperty({ description: 'Custo publicitário acumulado' })
  spend!: number;

  @ApiPropertyOptional({
    description: 'Orçamento restante. Nulo quando a campanha não possui orçamento.',
    nullable: true,
  })
  remainingBudget?: number | null;

  @ApiPropertyOptional({ description: 'Custo por clique configurado', nullable: true })
  costPerClick?: number | null;

  @ApiPropertyOptional({ description: 'Custo por mil configurado (1000 impressões)', nullable: true })
  costPerMille?: number | null;

  @ApiProperty({ description: 'Conversões atribuídas (total)' })
  conversions!: number;

  @ApiProperty({ description: 'Receita atribuída (total, monetária)' })
  revenue!: number;

  @ApiProperty({
    description: 'Retorno sobre o investimento em anúncios (receita / gasto). Nulo quando não há gasto.',
    nullable: true,
  })
  roas!: number | null;

  @ApiPropertyOptional()
  targetJson?: Record<string, unknown> | null;

  @ApiProperty({ type: [SponsoredItemResponseDto] })
  items!: SponsoredItemResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(plain: Record<string, unknown>): CampaignResponseDto {
    const dto = new CampaignResponseDto();
    dto.id = plain.id as string;
    dto.companyId = plain.companyId as string;
    dto.name = plain.name as string;
    dto.status = plain.status as string;
    dto.startAt = plain.startAt as Date | null;
    dto.endAt = plain.endAt as Date | null;
    dto.budget = plain.budget === null || plain.budget === undefined ? null : Number(plain.budget);
    dto.spend = plain.spend === null || plain.spend === undefined ? 0 : Number(plain.spend);
    dto.remainingBudget =
      dto.budget === null ? null : Math.max(0, dto.budget - dto.spend);
    dto.costPerClick =
      plain.costPerClick === null || plain.costPerClick === undefined
        ? null
        : Number(plain.costPerClick);
    dto.costPerMille =
      plain.costPerMille === null || plain.costPerMille === undefined
        ? null
        : Number(plain.costPerMille);
    dto.conversions = plain.conversions === null || plain.conversions === undefined ? 0 : Number(plain.conversions);
    dto.revenue = plain.revenue === null || plain.revenue === undefined ? 0 : Number(plain.revenue);
    dto.roas = dto.spend > 0 ? Math.round((dto.revenue / dto.spend) * 10000) / 10000 : null;
    dto.targetJson = plain.targetJson as Record<string, unknown> | null;
    dto.items = (plain.items as Array<Record<string, unknown>>)?.map(SponsoredItemResponseDto.fromPlain) ?? [];
    dto.createdAt = plain.createdAt as Date;
    dto.updatedAt = plain.updatedAt as Date;
    return dto;
  }
}
