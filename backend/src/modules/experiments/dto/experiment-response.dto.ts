import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExperimentVariantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  allocation!: number;

  @ApiPropertyOptional()
  config?: Record<string, unknown> | null;
}

export class ExperimentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  startAt?: Date | null;

  @ApiPropertyOptional()
  endAt?: Date | null;

  @ApiPropertyOptional()
  targeting?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [ExperimentVariantResponseDto] })
  variants!: ExperimentVariantResponseDto[];
}
