import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExperimentTargetingDto {
  @ApiPropertyOptional({ description: 'Only authenticated subjects are eligible (v1 default)' })
  @IsOptional()
  @IsBoolean()
  authenticated?: boolean;

  @ApiPropertyOptional({ description: 'Restrict to subjects belonging to these companies' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  companyIds?: string[];
}
