import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/generated/prisma/enums.js';

export class UpdateMemberDto {
  @ApiProperty({ enum: [UserRole.MERCHANT_OWNER, UserRole.MERCHANT_MANAGER] })
  @IsEnum(UserRole)
  role!: UserRole;
}

