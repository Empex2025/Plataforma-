import { IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExperimentVariantDto {
  @ApiProperty({ description: 'Chave da variante (ex.: CONTROL, TREATMENT)', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  key!: string;

  @ApiProperty({ description: 'Nome legível da variante', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Percentual de alocação (0..100). Todas as variantes devem somar 100.' })
  @IsInt()
  @Min(0)
  @Max(100)
  allocation!: number;

  @ApiPropertyOptional({ description: 'Configuração da variante (ex.: { recommendation_mode: "hybrid" })' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
