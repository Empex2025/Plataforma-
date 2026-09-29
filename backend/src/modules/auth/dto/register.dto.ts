import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDocument } from '@/common/validators/is-document.validator.js';

export class RegisterDto {
  @ApiProperty({
    description: 'Tipo de pessoa: PF (autônomo) ou PJ (empresa)',
    enum: ['PF', 'PJ'],
    example: 'PJ',
  })
  @IsIn(['PF', 'PJ'])
  personType!: 'PF' | 'PJ';

  @ApiProperty({
    description: 'CPF (PF) ou CNPJ (PJ) do titular',
    example: '32.023.645/0001-06',
  })
  @IsString()
  @IsNotEmpty()
  @IsDocument()
  document!: string;

  @ApiProperty({ description: 'E-mail do responsável', example: 'contato@provedor.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Senha do usuário (mínimo de 8 caracteres)',
    example: 'S3nhaF0rte!',
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ description: 'Telefone de contato', example: '+5511999998888' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Nome do responsável', example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
