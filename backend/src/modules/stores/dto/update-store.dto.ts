import { IsString, IsOptional, IsNumber, Min, Max, Length, IsEmail } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto {
  @ApiPropertyOptional({ example: 'Nova Loja' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  name?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada' })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({ example: '11988888888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '11988888888' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'novo@loja.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Av. Example' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '456' })
  @IsOptional()
  @IsString()
  addressNum?: string;

  @ApiPropertyOptional({ example: 'Andar 3' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Jardins' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Rio de Janeiro' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'RJ' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '22041-080' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ example: -22.9068 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: -43.1729 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
