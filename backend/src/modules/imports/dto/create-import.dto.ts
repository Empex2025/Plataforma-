import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateImportDto {
  @ApiPropertyOptional({ description: 'UUID da loja a associar a esta importação' })
  @IsOptional()
  @IsUUID()
  storeId?: string;
}
