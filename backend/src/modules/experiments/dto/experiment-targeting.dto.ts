import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExperimentTargetingDto {
  @ApiPropertyOptional({ description: 'Apenas sujeitos autenticados são elegíveis (padrão da v1)' })
  @IsOptional()
  @IsBoolean()
  authenticated?: boolean;

  @ApiPropertyOptional({ description: 'Restringir a sujeitos pertencentes a estas empresas' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  companyIds?: string[];
}
