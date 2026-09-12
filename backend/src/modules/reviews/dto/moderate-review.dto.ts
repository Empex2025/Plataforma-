import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModerateReviewDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], description: 'Decisão da moderação' })
  @IsEnum(['APPROVED', 'REJECTED'] as const)
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ description: 'Observação do moderador' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
