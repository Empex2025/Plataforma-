import { IsString, IsOptional, IsNumber, Min, Max, MinLength, MaxLength, IsDateString, ValidateNested, IsArray, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MIN_CAMPAIGN_NAME_LENGTH, MAX_CAMPAIGN_NAME_LENGTH, SPONSORED_WEIGHT_MAX } from '../advertising.constants.js';

export class CreateSponsoredItemDto {
  @ApiProperty({ description: 'Tipo do alvo', enum: ['store', 'product', 'offer'] })
  @IsString()
  @IsIn(['store', 'product', 'offer'])
  targetType!: 'store' | 'product' | 'offer';

  @ApiProperty({ description: 'UUID do alvo' })
  @IsUUID()
  targetId!: string;

  @ApiPropertyOptional({ description: 'Peso para o ranqueamento', default: 1, maximum: SPONSORED_WEIGHT_MAX })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(SPONSORED_WEIGHT_MAX)
  @Type(() => Number)
  weight?: number;
}

export class CampaignTargetJsonDto {
  @ApiPropertyOptional({ description: 'Nomes de categorias a segmentar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Nomes de cidades a segmentar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cities?: string[];

  @ApiPropertyOptional({ description: 'Siglas de estados a segmentar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  states?: string[];

  @ApiPropertyOptional({ description: 'Termos de busca a segmentar' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchTerms?: string[];
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Nome da campanha', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(MIN_CAMPAIGN_NAME_LENGTH)
  @MaxLength(MAX_CAMPAIGN_NAME_LENGTH)
  name!: string;

  @ApiPropertyOptional({ description: 'Data de início (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: 'Data de término (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: 'Valor do orçamento', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  budget?: number;

  @ApiPropertyOptional({ description: 'Custo por clique (configurado pelo negócio)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPerClick?: number;

  @ApiPropertyOptional({ description: 'Custo por mil / 1000 impressões (configurado pelo negócio)', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  costPerMille?: number;

  @ApiPropertyOptional({ description: 'Configuração de segmentação', type: CampaignTargetJsonDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignTargetJsonDto)
  targetJson?: CampaignTargetJsonDto;

  @ApiPropertyOptional({ description: 'Itens patrocinados', type: [CreateSponsoredItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSponsoredItemDto)
  items?: CreateSponsoredItemDto[];
}
