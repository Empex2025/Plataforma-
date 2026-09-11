import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { MembersService } from './members.service.js';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: {
    userCompany: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock; count: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  const mockPlanAccess = {
    assertWithinLimit: jest.fn().mockResolvedValue(undefined),
    checkLimit: jest.fn(),
    can: jest.fn(),
  };

  beforeEach(() => {
    prisma = {
      userCompany: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    mockPlanAccess.assertWithinLimit.mockResolvedValue(undefined);
    service = new MembersService(prisma as never, mockPlanAccess as never);
  });

  describe('addMember', () => {
    it('should add a member', async () => {
      prisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' })
        .mockResolvedValueOnce(null);
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', email: 'u2@test.com', active: true });
      prisma.userCompany.create.mockResolvedValue({
        userId: 'u2', companyId: 'c1', role: 'MERCHANT_MANAGER', createdAt: new Date(),
        user: { email: 'u2@test.com', name: null },
      });

      const result = await service.addMember('c1', 'owner', { email: 'u2@test.com', role: 'MERCHANT_MANAGER' as never });
      expect(result.userId).toBe('u2');
    });

    it('should reject non-owner', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'mgr', companyId: 'c1', role: 'MERCHANT_MANAGER' });

      await expect(
        service.addMember('c1', 'mgr', { email: 'u2@test.com', role: 'MERCHANT_MANAGER' as never }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when the plan member limit is reached', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' });
      mockPlanAccess.assertWithinLimit.mockRejectedValueOnce(
        new ForbiddenException({ message: 'Plan limit reached', feature: 'MAX_MEMBERS' }),
      );

      await expect(
        service.addMember('c1', 'owner', { email: 'u2@test.com', role: 'MERCHANT_MANAGER' as never }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPlanAccess.assertWithinLimit).toHaveBeenCalledWith('c1', 'MAX_MEMBERS');
    });

    it('should reject non-existent user', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.addMember('c1', 'owner', { email: 'ghost@test.com', role: 'MERCHANT_MANAGER' as never }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate membership', async () => {
      prisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' })
        .mockResolvedValueOnce({ userId: 'u2', companyId: 'c1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', active: true });

      await expect(
        service.addMember('c1', 'owner', { email: 'u2@test.com', role: 'MERCHANT_MANAGER' as never }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should update member role', async () => {
      prisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' })
        .mockResolvedValueOnce({ userId: 'u2', companyId: 'c1', role: 'MERCHANT_MANAGER' });
      prisma.userCompany.update.mockResolvedValue({
        userId: 'u2', role: 'MERCHANT_OWNER',
        user: { email: 'u2@test.com', name: null },
      });

      const result = await service.updateRole('c1', 'owner', 'u2', { role: 'MERCHANT_OWNER' as never });
      expect(result.role).toBe('MERCHANT_OWNER');
    });

    it('should prevent downgrading last owner', async () => {
      prisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' })
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' });
      prisma.userCompany.count.mockResolvedValue(1);

      await expect(
        service.updateRole('c1', 'owner', 'owner', { role: 'MERCHANT_MANAGER' as never }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      prisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' })
        .mockResolvedValueOnce({ userId: 'u2', companyId: 'c1' });
      prisma.userCompany.delete.mockResolvedValue({});

      await service.removeMember('c1', 'owner', 'u2');
      expect(prisma.userCompany.delete).toHaveBeenCalled();
    });

    it('should prevent removing last owner', async () => {
      prisma.userCompany.findUnique
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' })
        .mockResolvedValueOnce({ userId: 'owner', companyId: 'c1', role: 'MERCHANT_OWNER' });
      prisma.userCompany.count.mockResolvedValue(1);

      await expect(service.removeMember('c1', 'owner', 'owner')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listMembers', () => {
    it('should list members', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.userCompany.findMany.mockResolvedValue([
        { userId: 'u1', role: 'MERCHANT_OWNER', createdAt: new Date(), user: { email: 'u1@test.com', name: null } },
        { userId: 'u2', role: 'MERCHANT_MANAGER', createdAt: new Date(), user: { email: 'u2@test.com', name: null } },
      ]);

      const result = await service.listMembers('c1', 'u1');
      expect(result).toHaveLength(2);
    });
  });
});
