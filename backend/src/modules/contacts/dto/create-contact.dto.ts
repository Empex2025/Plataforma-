import { IsEnum, IsUUID, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType } from '../../../generated/prisma/enums.js';

export class CreateContactDto {
  @ApiProperty({ description: 'ID da loja' })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ enum: ContactType, description: 'Tipo de contato' })
  @IsEnum(ContactType)
  type!: ContactType;

  @ApiProperty({ description: 'Valor do contato (ex: número de telefone)' })
  @IsString()
  @MaxLength(500)
  value!: string;

  @ApiPropertyOptional({ description: 'Dados extras do contato' })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
