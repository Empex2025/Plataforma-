import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({ description: 'Dados do usuário autenticado', type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ description: 'Token de acesso JWT' })
  token!: string;
}
