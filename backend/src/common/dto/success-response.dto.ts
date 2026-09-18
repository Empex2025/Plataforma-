import { ApiProperty } from '@nestjs/swagger';

/**
 * Resposta padrão para operações que apenas confirmam sucesso.
 */
export class SuccessResponseDto {
  @ApiProperty({ description: 'Indica se a operação foi concluída com sucesso', example: true })
  success!: boolean;
}
