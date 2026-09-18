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
  @ApiProperty({ description: 'Chave estável do experimento (slug)', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'key deve conter apenas letras minúsculas, dígitos e hífens' })
  key!: string;

  @ApiProperty({ description: 'Domínio do experimento', enum: EXPERIMENT_DOMAINS })
  @IsIn([...EXPERIMENT_DOMAINS])
  domain!: string;

  @ApiProperty({ description: 'Nome do experimento', maxLength: 150 })
  @IsString()
  @MaxLength(150)
  name!: string;

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

  @ApiProperty({ description: 'Variantes (a alocação deve somar 100)', type: [ExperimentVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperimentVariantDto)
  variants!: ExperimentVariantDto[];
}
