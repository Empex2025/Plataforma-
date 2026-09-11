import { IsEnum, IsUUID, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewTargetType } from '../../../generated/prisma/enums.js';

export class CreateReviewDto {
  @ApiProperty({ enum: ReviewTargetType, description: 'Tipo do alvo (PRODUCT ou STORE)' })
  @IsEnum(ReviewTargetType)
  targetType!: ReviewTargetType;

  @ApiProperty({ description: 'ID do produto ou loja' })
  @IsUUID()
  targetId!: string;

  @ApiProperty({ description: 'Nota de 1 a 5', minimum: 1, maximum: 5 })
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: 'Título da avaliação' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Comentário da avaliação' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
