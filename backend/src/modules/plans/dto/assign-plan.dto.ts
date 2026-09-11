import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPlanDto {
  @ApiProperty({ description: 'ID do plano a ser atribuído', format: 'uuid' })
  @IsUUID()
  planId!: string;
}
