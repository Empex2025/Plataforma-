import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CnpjCompanyData } from '@/common/providers/cnpj/cnpj.types.js';

export class CnpjAddressDto {
  @ApiPropertyOptional({ description: 'CEP', example: '01310-100', nullable: true })
  cep?: string | null;

  @ApiPropertyOptional({ description: 'Logradouro', example: 'Avenida Paulista', nullable: true })
  logradouro?: string | null;

  @ApiPropertyOptional({ description: 'Número', example: '1000', nullable: true })
  numero?: string | null;

  @ApiPropertyOptional({ description: 'Complemento', example: 'Sala 10', nullable: true })
  complemento?: string | null;

  @ApiPropertyOptional({ description: 'Bairro', example: 'Bela Vista', nullable: true })
  bairro?: string | null;

  @ApiPropertyOptional({ description: 'Cidade', example: 'São Paulo', nullable: true })
  cidade?: string | null;

  @ApiPropertyOptional({ description: 'Estado (UF)', example: 'SP', nullable: true })
  estado?: string | null;
}

export class CnpjActivityDto {
  @ApiPropertyOptional({ description: 'Código da atividade (CNAE)', example: '6201-5/01', nullable: true })
  codigo?: string | null;

  @ApiPropertyOptional({ description: 'Descrição da atividade', example: 'Desenvolvimento de programas de computador sob encomenda', nullable: true })
  descricao?: string | null;
}

export class CnpjCompanyResponseDto {
  @ApiProperty({ description: 'CNPJ da empresa (apenas dígitos)', example: '12345678000199' })
  cnpj!: string;

  @ApiProperty({ description: 'Razão social da empresa', example: 'EMPRESA EXEMPLO LTDA' })
  razaoSocial!: string;

  @ApiPropertyOptional({ description: 'Nome fantasia da empresa', example: 'Empresa Exemplo', nullable: true })
  nomeFantasia?: string | null;

  @ApiPropertyOptional({ description: 'Situação cadastral da empresa', example: 'ATIVA', nullable: true })
  situacaoCadastral?: string | null;

  @ApiPropertyOptional({ description: 'Endereço da empresa', type: CnpjAddressDto })
  address?: CnpjAddressDto;

  @ApiPropertyOptional({ description: 'Telefone da empresa', example: '1133334444', nullable: true })
  telefone?: string | null;

  @ApiPropertyOptional({ description: 'E-mail da empresa', example: 'contato@empresa.com.br', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Atividade principal da empresa', type: CnpjActivityDto })
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
