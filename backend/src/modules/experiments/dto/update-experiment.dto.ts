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
  @ApiPropertyOptional({ description: 'Nome do experimento', maxLength: 150 })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição do experimento', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Regras de segmentação', type: ExperimentTargetingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExperimentTargetingDto)
  targeting?: ExperimentTargetingDto;

  @ApiPropertyOptional({ description: 'Data de início planejada (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Data de término planejada (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'Substitui o conjunto de variantes. As atribuições existentes são preservadas.',
    type: [ExperimentVariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants?: ExperimentVariantDto[];
}
