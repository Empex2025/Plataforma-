import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventType } from '../../../generated/prisma/enums.js';

export class CreateEventDto {
  @ApiProperty({ enum: EventType, description: 'Tipo do evento' })
  @IsEnum(EventType)
  type!: EventType;

  @ApiPropertyOptional({ description: 'ID da sessão do usuário (para eventos anônimos)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Tipo da entidade alvo (ex: product, store)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetType?: string;

  @ApiPropertyOptional({ description: 'ID da entidade alvo' })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiPropertyOptional({ description: 'Dados extras do evento (max 10KB)', type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Latitude', minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude', minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  lng?: number;
}
