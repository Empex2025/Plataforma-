import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FavoriteTargetType } from '@/generated/prisma/enums.js';

export class CreateFavoriteDto {
  @ApiProperty({ enum: FavoriteTargetType, description: 'Tipo do alvo (PRODUCT ou STORE)' })
  @IsEnum(FavoriteTargetType)
  targetType!: FavoriteTargetType;

  @ApiProperty({ description: 'ID do produto ou loja' })
  @IsUUID()
  targetId!: string;
}
