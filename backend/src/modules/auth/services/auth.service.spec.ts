import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '@/db/prisma.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import { LoginAttemptService } from './login-attempt.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { VerificationService } from './verification.service.js';
import { MailerService } from './mailer.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    company: { findUnique: jest.Mock; create: jest.Mock };
    userCompany: { findFirst: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwt: { sign: jest.Mock };
  let refreshTokens: { issue: jest.Mock; rotate: jest.Mock; revoke: jest.Mock };
  let loginAttempts: { isLocked: jest.Mock; registerFailure: jest.Mock; reset: jest.Mock };
  let passwordReset: { request: jest.Mock; consume: jest.Mock };
  let verification: { request: jest.Mock; consume: jest.Mock };
  let mailer: { sendVerificationOtp: jest.Mock; sendVerificationSms: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      company: { findUnique: jest.fn(), create: jest.fn() },
      userCompany: { findFirst: jest.fn(), create: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: unknown) => unknown) =>
          callback(prisma),
        ),
    };

    jwt = { sign: jest.fn().mockReturnValue('mock-token') };
    refreshTokens = {
      issue: jest.fn().mockResolvedValue('mock-refresh'),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };
    loginAttempts = {
      isLocked: jest.fn().mockResolvedValue(false),
      registerFailure: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };
    passwordReset = {
      request: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue(true),
    };
    verification = {
      request: jest.fn().mockResolvedValue('123456'),
      consume: jest.fn().mockResolvedValue(true),
    };
    mailer = {
      sendVerificationOtp: jest.fn().mockResolvedValue(undefined),
      sendVerificationSms: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: RefreshTokenService, useValue: refreshTokens },
        { provide: LoginAttemptService, useValue: loginAttempts },
        { provide: PasswordResetService, useValue: passwordReset },
        { provide: VerificationService, useValue: verification },
        { provide: MailerService, useValue: mailer },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = {
      personType: 'PJ' as const,
      document: '11.222.333/0001-81',
      email: 'test@example.com',
      password: 'S3nhaF0rte!',
    };

    it('should register a new merchant successfully', async () => {
      const created = {
        id: 'uuid-1',
        email: 'test@example.com',
        name: null,
        passwordHash: 'hashed',
        phone: null,
        personType: 'PJ',
        document: '11222333000181',
        role: 'MERCHANT_OWNER',
        active: true,
        avatarUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(created);
      prisma.user.findUniqueOrThrow.mockResolvedValue(created);

      const result = await service.register(dto);

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(mailer.sendVerificationOtp).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate document', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('S3nhaF0rte!', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'MERCHANT_OWNER',
        active: true,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'S3nhaF0rte!',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('mock-token');
      expect(loginAttempts.reset).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      loginAttempts.isLocked.mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'S3nhaF0rte!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'S3nhaF0rte!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(loginAttempts.registerFailure).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('CorrectPassword!', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'MERCHANT_OWNER',
        active: true,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(loginAttempts.registerFailure).toHaveBeenCalled();
    });

    it('should throw GoneException for inactive user', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('S3nhaF0rte!', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        role: 'MERCHANT_OWNER',
        active: false,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'S3nhaF0rte!' }),
      ).rejects.toThrow(GoneException);
    });
  });

  describe('refresh', () => {
    it('should rotate tokens and return the user', async () => {
      refreshTokens.rotate.mockResolvedValue({
        userId: 'uuid-1',
        email: 'test@example.com',
        refreshToken: 'new-refresh',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed',
        role: 'MERCHANT_OWNER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.refresh('old-refresh');

      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('new-refresh');
      expect(refreshTokens.rotate).toHaveBeenCalledWith('old-refresh');
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException for invalid OTP', async () => {
      passwordReset.consume.mockResolvedValue(false);

      await expect(
        service.resetPassword({
          email: 'test@example.com',
          otp: '000000',
          password: 'N3wPassword!',
        }),
      ).rejects.toThrow(BadRequestException);
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

  describe('convertToPj', () => {
    it('should elevate a PF account to PJ within a transaction', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Autônomo',
        passwordHash: 'hashed',
        personType: 'PF',
        document: '52998224725',
        role: 'MERCHANT_OWNER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.company.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.company.create.mockResolvedValue({ id: 'company-1' });
      prisma.userCompany.create.mockResolvedValue({});
      prisma.user.update.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        name: 'Empresa X LTDA',
        passwordHash: 'hashed',
        personType: 'PJ',
        document: '11222333000181',
        role: 'MERCHANT_OWNER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.convertToPj('uuid-1', {
        cnpj: '11.222.333/0001-81',
        corporateName: 'Empresa X LTDA',
      });

      expect(prisma.company.create).toHaveBeenCalledTimes(1);
      expect(prisma.userCompany.create).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('uuid-1');
    });

    it('should reject invalid CNPJ', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'uuid-1',
        personType: 'PF',
      });

      await expect(
        service.convertToPj('uuid-1', {
          cnpj: '11.111.111/1111-11',
          corporateName: 'Empresa X LTDA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
