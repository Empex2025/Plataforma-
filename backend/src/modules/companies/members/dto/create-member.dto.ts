import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/generated/prisma/enums.js';

export class CreateMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: [UserRole.MERCHANT_OWNER, UserRole.MERCHANT_MANAGER] })
  @IsEnum(UserRole)
  role!: UserRole;
}

