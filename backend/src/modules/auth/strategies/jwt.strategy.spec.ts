import { jest } from '@jest/globals';
import { UnauthorizedException, GoneException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };

    const configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    strategy = new JwtStrategy(configService as never, prisma as never);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw if JWT_SECRET is not defined', () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) };
    expect(() => new JwtStrategy(configService as never, prisma as never)).toThrow('JWT_SECRET is not defined');
  });

  describe('validate', () => {
    it('should return user data for a valid active user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'CONSUMER',
        active: true,
      });

      const result = await strategy.validate({ sub: 'user-1', email: 'test@example.com' });

      expect(result).toEqual({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'CONSUMER',
        active: true,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'nonexistent', email: 'x@x.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw GoneException when user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'CONSUMER',
        active: false,
      });

      await expect(
        strategy.validate({ sub: 'user-1', email: 'test@example.com' }),
      ).rejects.toThrow(GoneException);
    });

    it('should return correct role for admin user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
        active: true,
      });

      const result = await strategy.validate({ sub: 'admin-1', email: 'admin@example.com' });

      expect(result.role).toBe('ADMIN');
    });

    it('should not include passwordHash in response', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'CONSUMER',
        active: true,
        passwordHash: 'secret-hash',
      });

      const result = await strategy.validate({ sub: 'user-1', email: 'test@example.com' });

      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
