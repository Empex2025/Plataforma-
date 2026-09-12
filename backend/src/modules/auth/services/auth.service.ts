import { Injectable, ConflictException, UnauthorizedException, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcryptjs';
import { PrismaService } from '@/db/prisma.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto.js';

const SALT_ROUNDS = 10;

interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  user: UserResponseDto;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        phone: dto.phone,
        role: 'CONSUMER',
      },
    });

    const token = this.signToken({ sub: user.id, email: user.email });

    return {
      user: UserResponseDto.fromPlain(user),
      token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.active) {
      throw new GoneException('Account is deactivated');
    }

    const passwordValid = await compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken({ sub: user.id, email: user.email });

    return {
      user: UserResponseDto.fromPlain(user),
      token,
    };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return UserResponseDto.fromPlain(user);
  }

  private signToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload);
  }
}
