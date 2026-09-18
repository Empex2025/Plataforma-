import { ApiProperty } from '@nestjs/swagger';

export class SponsoredResultDto {
  @ApiProperty({ description: 'Tipo de posicionamento', enum: ['ORGANIC', 'SPONSORED'] })
  placementType!: 'ORGANIC' | 'SPONSORED';

  @ApiProperty({ description: 'Indica se este é um resultado patrocinado' })
  isSponsored!: boolean;

  @ApiProperty({ description: 'ID da campanha (somente para resultados patrocinados)' })
  campaignId?: string;

  @ApiProperty({ description: 'Peso do patrocínio' })
  weight?: number;

  static organic(): SponsoredResultDto {
    const dto = new SponsoredResultDto();
    dto.placementType = 'ORGANIC';
    dto.isSponsored = false;
    return dto;
  }

  static sponsored(campaignId: string, weight: number): SponsoredResultDto {
    const dto = new SponsoredResultDto();
    dto.placementType = 'SPONSORED';
    dto.isSponsored = true;
    dto.campaignId = campaignId;
    dto.weight = weight;
    return dto;
  }
}
