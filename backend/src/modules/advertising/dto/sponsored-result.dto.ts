import { ApiProperty } from '@nestjs/swagger';

export class SponsoredResultDto {
  @ApiProperty({ description: 'Placement type', enum: ['ORGANIC', 'SPONSORED'] })
  placementType!: 'ORGANIC' | 'SPONSORED';

  @ApiProperty({ description: 'Whether this is a sponsored result' })
  isSponsored!: boolean;

  @ApiProperty({ description: 'Campaign ID (only for sponsored results)' })
  campaignId?: string;

  @ApiProperty({ description: 'Sponsored weight' })
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
