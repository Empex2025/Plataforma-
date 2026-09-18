import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ description: 'Identificador da notificação' })
  id!: string;

  @ApiProperty({ description: 'Identificador do usuário' })
  userId!: string;

  @ApiProperty({ description: 'Tipo da notificação' })
  type!: string;

  @ApiProperty({ description: 'Título da notificação' })
  title!: string;

  @ApiProperty({ description: 'Mensagem da notificação' })
  message!: string;

  @ApiPropertyOptional({ description: 'Tipo do alvo', nullable: true })
  targetType?: string | null;

  @ApiPropertyOptional({ description: 'Identificador do alvo', nullable: true })
  targetId?: string | null;

  @ApiPropertyOptional({ description: 'Data de leitura', nullable: true })
  readAt?: Date | null;

  @ApiProperty({ description: 'Data de criação do registro' })
  createdAt!: Date;

  static fromPlain(plain: Record<string, unknown>): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = plain.id as string;
    dto.userId = plain.userId as string;
    dto.type = plain.type as string;
    dto.title = plain.title as string;
    dto.message = plain.message as string;
    dto.targetType = plain.targetType as string | null;
    dto.targetId = plain.targetId as string | null;
    dto.readAt = plain.readAt as Date | null;
    dto.createdAt = plain.createdAt as Date;
    return dto;
  }
}
