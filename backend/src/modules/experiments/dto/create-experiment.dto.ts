import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EXPERIMENT_DOMAINS } from '../experiments.constants.js';
import { ExperimentTargetingDto } from './experiment-targeting.dto.js';
import { ExperimentVariantDto } from './experiment-variant.dto.js';

export class CreateExperimentDto {
  @ApiProperty({ description: 'Stable experiment key (slug)', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'key must contain only lowercase letters, digits and hyphens' })
  key!: string;

  @ApiProperty({ description: 'Experiment domain', enum: EXPERIMENT_DOMAINS })
  @IsIn([...EXPERIMENT_DOMAINS])
  domain!: string;

  @ApiProperty({ description: 'Experiment name', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

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

  @ApiProperty({ description: 'Variants (allocation must sum to 100)', type: [ExperimentVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants!: ExperimentVariantDto[];
}
