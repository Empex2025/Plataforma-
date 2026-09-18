import { IsEmail, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@/generated/prisma/enums.js';

export class CreateMemberDto {
  @ApiProperty({ description: 'E-mail do usuário a ser adicionado', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Papel do membro na empresa', enum: [UserRole.MERCHANT_OWNER, UserRole.MERCHANT_MANAGER] })
  @IsEnum(UserRole)
  role!: UserRole;
}
