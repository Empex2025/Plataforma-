import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportErrorResponseDto {
  @ApiProperty({ description: 'Identificador do erro de importação' })
  id!: string;

  @ApiProperty({ description: 'Número da linha com erro' })
  line!: number;

  @ApiPropertyOptional({ description: 'Campo com erro', nullable: true })
  field?: string | null;

  @ApiProperty({ description: 'Código do erro' })
  code!: string;

  @ApiProperty({ description: 'Mensagem do erro' })
  message!: string;

  @ApiPropertyOptional({ description: 'Valor que causou o erro', nullable: true })
  value?: string | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  static fromPlain(error: {
    id: string;
    line: number;
    field?: string | null;
    code: string;
    message: string;
    value?: string | null;
    createdAt: Date;
  }): ImportErrorResponseDto {
    const dto = new ImportErrorResponseDto();
    dto.id = error.id;
    dto.line = error.line;
    dto.field = error.field ?? null;
    dto.code = error.code;
    dto.message = error.message;
    dto.value = error.value ?? null;
    dto.createdAt = error.createdAt;
    return dto;
  }
}
