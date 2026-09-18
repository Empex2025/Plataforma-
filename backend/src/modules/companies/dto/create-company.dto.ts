import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Nome da empresa', example: 'Minha Empresa' })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiPropertyOptional({ description: 'Slug da empresa', example: 'minha-empresa' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'O slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'CNPJ da empresa (apenas dígitos)', example: '12345678000199' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'O CNPJ deve conter exatamente 14 dígitos' })
  cnpj?: string;

  @ApiPropertyOptional({ description: 'Descrição da empresa', example: 'Descrição da empresa' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}
