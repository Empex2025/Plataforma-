import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromPlain(user: {
    id: string;
    email: string;
    name?: string | null;
    phone?: string | null;
    role: string;
    active: boolean;
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
    dto.avatarUrl = user.avatarUrl;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
