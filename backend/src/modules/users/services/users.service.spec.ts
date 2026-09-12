import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'A',
        passwordHash: 'hashed',
        role: 'CONSUMER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('u1');
      expect(result.id).toBe('u1');
      expect(result.passwordHash).toBeUndefined();
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update name and phone', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'New Name',
        phone: '+5511999998888',
        passwordHash: 'hashed',
        role: 'CONSUMER',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateProfile('u1', {
        name: 'New Name',
        phone: '+5511999998888',
      });

      expect(result.name).toBe('New Name');
      expect(result.phone).toBe('+5511999998888');
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile('nonexistent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('OldPassword!', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hashedPassword,
      });
      prisma.user.update.mockResolvedValue({});

      await expect(
        service.changePassword('u1', {
          currentPassword: 'OldPassword!',
          newPassword: 'N3wPassword!',
        }),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException with wrong current password', async () => {
      const { hash } = await import('bcryptjs');
      const hashedPassword = await hash('CorrectPassword!', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: hashedPassword,
      });

      await expect(
        service.changePassword('u1', {
          currentPassword: 'WrongPassword!',
          newPassword: 'N3wPassword!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({});

      await expect(service.deactivate('u1')).resolves.toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { active: false },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deactivate('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
