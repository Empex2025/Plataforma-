import { IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Confortável' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 'confortavel' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({ example: 'attribute', enum: ['attribute', 'style', 'occasion', 'use_case'] })
  @IsOptional()
  @IsString()
  group?: string;
}
