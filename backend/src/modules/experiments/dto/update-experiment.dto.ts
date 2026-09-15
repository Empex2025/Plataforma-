import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ExperimentTargetingDto } from './experiment-targeting.dto.js';
import { ExperimentVariantDto } from './experiment-variant.dto.js';

export class UpdateExperimentDto {
  @ApiPropertyOptional({ description: 'Experiment name', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Experiment description', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Targeting rules', type: ExperimentTargetingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExperimentTargetingDto)
  targeting?: ExperimentTargetingDto;

  @ApiPropertyOptional({ description: 'Planned start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Planned end date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'Replaces the variant set. Existing assignments are preserved.',
    type: [ExperimentVariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants?: ExperimentVariantDto[];
}
