import { IsOptional, IsString, Min, Max, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional({ description: 'Nota de 1 a 5', minimum: 1, maximum: 5 })
  @IsOptional()
  @Min(1)
  @Max(5)
  rating?: number;

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
