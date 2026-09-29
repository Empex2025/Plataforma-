import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'Identificador do usuário' })
  id!: string;

  @ApiProperty({ description: 'E-mail do usuário' })
  email!: string;

  @ApiPropertyOptional({ description: 'Nome completo do usuário', nullable: true })
  name?: string | null;

  @ApiPropertyOptional({ description: 'Telefone de contato', nullable: true })
  phone?: string | null;

  @ApiProperty({ description: 'Papel do usuário na plataforma' })
  role!: string;

  @ApiProperty({ description: 'Indica se a conta está ativa' })
  active!: boolean;

  @ApiPropertyOptional({ description: 'Data de verificação do e-mail', nullable: true })
  emailVerifiedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Data de verificação do telefone', nullable: true })
  phoneVerifiedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Data de conclusão do cadastro', nullable: true })
  profileCompletedAt?: Date | null;

  @ApiPropertyOptional({ description: 'URL do avatar do usuário', nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ description: 'Data de criação do usuário' })
  createdAt!: Date;

  @ApiProperty({ description: 'Data da última atualização do usuário' })
  updatedAt!: Date;

  static fromPlain(user: {
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
    role: string;
    active: boolean;
    emailVerifiedAt?: Date | null;
    phoneVerifiedAt?: Date | null;
    profileCompletedAt?: Date | null;
    avatarUrl?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.phone = user.phone;
    dto.role = user.role;
    dto.active = user.active;
    dto.emailVerifiedAt = user.emailVerifiedAt;
    dto.phoneVerifiedAt = user.phoneVerifiedAt;
    dto.profileCompletedAt = user.profileCompletedAt;
    dto.avatarUrl = user.avatarUrl;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
