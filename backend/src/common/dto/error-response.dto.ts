import { ApiProperty } from '@nestjs/swagger';

/**
 * Formato padrão de erro da API (Nest HttpException).
 * Usado nas respostas de erro documentadas no Swagger para que o corpo apareça.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Código HTTP do erro', example: 403 })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensagem de erro (string ou lista de mensagens de validação)',
    example: 'Acesso negado',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({ description: 'Nome do erro HTTP', example: 'Forbidden' })
  error!: string;
}
