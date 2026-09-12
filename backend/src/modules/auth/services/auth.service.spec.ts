import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock; create: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
      },
    };

    jwt = { sign: jest.fn().mockReturnValue('mock-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        phone: null,
        role: 'CONSUMER',
        active: true,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'S3nhaF0rte!',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.token).toBe('mock-token');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'existing@example.com',
          name: 'Test',
          password: 'S3nhaF0rte!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('S3nhaF0rte!', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'CONSUMER',
        active: true,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'S3nhaF0rte!',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.passwordHash).toBeUndefined();
      expect(result.token).toBe('mock-token');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'S3nhaF0rte!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('CorrectPassword!', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'CONSUMER',
        active: true,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw GoneException for inactive user', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('S3nhaF0rte!', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'CONSUMER',
        active: false,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'S3nhaF0rte!',
        }),
      ).rejects.toThrow(GoneException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed',
        role: 'CONSUMER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getProfile('uuid-1');
      expect(result.email).toBe('test@example.com');
      expect(result.passwordHash).toBeUndefined();
    });
  });
});
