import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExperimentVariantDto {
  @ApiProperty({ description: 'Variant key (e.g. CONTROL, TREATMENT)', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  key!: string;

  @ApiProperty({ description: 'Human-readable variant name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Allocation percentage (0..100). All variants must sum to 100.' })
  @IsInt()
  @Min(0)
  @Max(100)
  allocation!: number;

  @ApiPropertyOptional({ description: 'Variant configuration (e.g. { recommendation_mode: "hybrid" })' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
