import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteRegistrationDto {
  @ApiProperty({ enum: ['PF', 'PJ'], example: 'PJ' })
  @IsIn(['PF', 'PJ'])
  type!: 'PF' | 'PJ';

  @ApiPropertyOptional({ example: 'Carlos Eduardo da Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: 'Loja da Esquina LTDA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  corporateName?: string;

  @ApiPropertyOptional({ example: 'Loja da Esquina' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tradeName?: string;

  @ApiPropertyOptional({ example: '4751-2/01' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cnae?: string;

  @ApiPropertyOptional({ example: 'Av. Paulista, 1578 - São Paulo - SP' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fullAddress?: string;

  @ApiPropertyOptional({ example: 'Carlos Eduardo da Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  repFullName?: string;
}
