import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  tier!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  maxStores!: number;

  @ApiProperty()
  maxProducts!: number;

  @ApiProperty()
  maxImports!: number;

  @ApiProperty()
  maxMembers!: number;

  @ApiProperty()
  analytics!: boolean;

  @ApiProperty()
  alerts!: boolean;

  static fromPlain(plain: Record<string, unknown>): PlanResponseDto {
    const dto = new PlanResponseDto();
    dto.id = plain.id as string;
    dto.name = plain.name as string;
    dto.tier = plain.tier as string;
    dto.description = plain.description as string | null;
    dto.maxStores = plain.maxStores as number;
    dto.maxProducts = plain.maxProducts as number;
    dto.maxImports = plain.maxImports as number;
    dto.maxMembers = plain.maxMembers as number;
    dto.analytics = plain.analytics as boolean;
    dto.alerts = plain.alerts as boolean;
    return dto;
  }
}
