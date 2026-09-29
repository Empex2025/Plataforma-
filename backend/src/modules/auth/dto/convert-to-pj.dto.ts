import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConvertToPjDto {
  @ApiProperty({ description: 'CNPJ da empresa', example: '32.023.645/0001-06' })
  @IsString()
  @IsNotEmpty()
  cnpj!: string;

  @ApiProperty({ description: 'Razão social', example: 'Loja da Esquina LTDA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  corporateName!: string;

  @ApiPropertyOptional({ description: 'Nome fantasia', example: 'Loja da Esquina' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;
}
