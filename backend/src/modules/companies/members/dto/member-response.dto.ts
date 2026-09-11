import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty()
  role!: string;

  @ApiProperty()
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
