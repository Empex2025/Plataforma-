import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportErrorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  line!: number;

  @ApiPropertyOptional()
  field?: string | null;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  value?: string | null;

  @ApiProperty()
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
