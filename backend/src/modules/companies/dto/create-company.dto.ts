import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Minha Empresa' })
  @IsString()
  @Length(2, 200)
  name!: string;

  @ApiPropertyOptional({ example: 'minha-empresa' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ example: '12345678000199' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{14}$/, { message: 'CNPJ must contain exactly 14 digits' })
  cnpj?: string;

  @ApiPropertyOptional({ example: 'Descrição da empresa' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}
