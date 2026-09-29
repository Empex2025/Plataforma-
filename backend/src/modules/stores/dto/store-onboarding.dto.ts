import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class StoreHourDto {
  @ApiProperty({ example: ['Seg', 'Ter', 'Qua'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  days!: string[];

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário inválido' })
  start!: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Horário inválido' })
  end!: string;
}

export class StoreOnboardingDto {
  @ApiProperty({ example: 'Loja da Esquina' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: '01.310-100' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @ApiPropertyOptional({ example: 'Av. Paulista' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'Sala 204' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  complement?: string;

  @ApiPropertyOptional({ example: 'São Paulo-SP' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  cityState?: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '11999999999' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @ApiPropertyOptional({ example: '@sualoja' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverUrl?: string;

  @ApiPropertyOptional({ type: [StoreHourDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StoreHourDto)
  hours?: StoreHourDto[];

  @ApiProperty({ example: -23.5505 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: -46.6333 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;
}
