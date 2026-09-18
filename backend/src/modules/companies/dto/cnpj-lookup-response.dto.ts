import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CnpjCompanyData } from '@/common/providers/cnpj/cnpj.types.js';

export class CnpjAddressDto {
  @ApiPropertyOptional({ example: '01310-100', nullable: true })
  cep?: string | null;

  @ApiPropertyOptional({ example: 'Avenida Paulista', nullable: true })
  logradouro?: string | null;

  @ApiPropertyOptional({ example: '1000', nullable: true })
  numero?: string | null;

  @ApiPropertyOptional({ example: 'Sala 10', nullable: true })
  complemento?: string | null;

  @ApiPropertyOptional({ example: 'Bela Vista', nullable: true })
  bairro?: string | null;

  @ApiPropertyOptional({ example: 'São Paulo', nullable: true })
  cidade?: string | null;

  @ApiPropertyOptional({ example: 'SP', nullable: true })
  estado?: string | null;
}

export class CnpjActivityDto {
  @ApiPropertyOptional({ example: '6201-5/01', nullable: true })
  codigo?: string | null;

  @ApiPropertyOptional({ example: 'Desenvolvimento de programas de computador sob encomenda', nullable: true })
  descricao?: string | null;
}

export class CnpjCompanyResponseDto {
  @ApiProperty({ example: '12345678000199' })
  cnpj!: string;

  @ApiProperty({ example: 'EMPRESA EXEMPLO LTDA' })
  razaoSocial!: string;

  @ApiPropertyOptional({ example: 'Empresa Exemplo', nullable: true })
  nomeFantasia?: string | null;

  @ApiPropertyOptional({ example: 'ATIVA', nullable: true })
  situacaoCadastral?: string | null;

  @ApiPropertyOptional({ type: CnpjAddressDto })
  address?: CnpjAddressDto;

  @ApiPropertyOptional({ example: '1133334444', nullable: true })
  telefone?: string | null;

  @ApiPropertyOptional({ example: 'contato@empresa.com.br', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ type: CnpjActivityDto })
  atividadePrincipal?: CnpjActivityDto;

  static fromData(data: CnpjCompanyData): CnpjCompanyResponseDto {
    const dto = new CnpjCompanyResponseDto();
    dto.cnpj = data.cnpj;
    dto.razaoSocial = data.razaoSocial;
    dto.nomeFantasia = data.nomeFantasia ?? null;
    dto.situacaoCadastral = data.situacaoCadastral ?? null;
    dto.address = data.address ? { ...data.address } : undefined;
    dto.telefone = data.telefone ?? null;
    dto.email = data.email ?? null;
    dto.atividadePrincipal = data.atividadePrincipal ? { ...data.atividadePrincipal } : undefined;
    return dto;
  }
}
