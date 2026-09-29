import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CepResult } from '@/common/providers/cep/cep-provider.interface.js';

export class CepResponseDto {
  @ApiProperty()
  cep!: string;

  @ApiProperty()
  street!: string;

  @ApiProperty()
  neighborhood!: string;

  @ApiProperty()
  city!: string;

  @ApiProperty()
  state!: string;

  @ApiPropertyOptional()
  complement?: string;

  static fromResult(result: CepResult): CepResponseDto {
    const dto = new CepResponseDto();
    dto.cep = result.cep;
    dto.street = result.street;
    dto.neighborhood = result.neighborhood;
    dto.city = result.city;
    dto.state = result.state;
    dto.complement = result.complement;
    return dto;
  }
}
