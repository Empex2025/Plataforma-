import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '@/db/prisma.service.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return UserResponseDto.fromPlain(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    });

    return UserResponseDto.fromPlain(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const { compare } = await import('bcryptjs');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const passwordValid = await compare(dto.currentPassword, user.passwordHash);

    if (!passwordValid) {
      throw new ForbiddenException('Senha atual incorreta');
    }

    const newHash = await hash(dto.newPassword, SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });
  }

  async deactivate(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });
  }
}
