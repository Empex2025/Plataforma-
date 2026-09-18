import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberResponseDto {
  @ApiProperty({ description: 'Identificador do usuário membro' })
  userId!: string;

  @ApiProperty({ description: 'E-mail do usuário membro' })
  email!: string;

  @ApiPropertyOptional({ description: 'Nome do usuário membro', nullable: true })
  name?: string | null;

  @ApiProperty({ description: 'Papel do membro na empresa' })
  role!: string;

  @ApiProperty({ description: 'Data de criação do vínculo' })
  createdAt!: Date;

  static fromPlain(membership: {
    userId: string;
    role: string;
    createdAt: Date;
    user: {
      email: string;
      name?: string | null;
    };
  }): MemberResponseDto {
    const dto = new MemberResponseDto();
    dto.userId = membership.userId;
    dto.email = membership.user.email;
    dto.name = membership.user.name;
    dto.role = membership.role;
    dto.createdAt = membership.createdAt;
    return dto;
  }
}
