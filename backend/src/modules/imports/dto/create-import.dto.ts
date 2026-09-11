import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateImportDto {
  @ApiPropertyOptional({ description: 'Store ID to associate with this import' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
