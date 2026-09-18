import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service.js';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: {
    company: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
    userCompany: { findUnique: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      company: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userCompany: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new CompaniesService(prisma as never);
  });

  describe('create', () => {
    it('should create company with owner membership', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.create.mockResolvedValue({
        id: 'c1',
        name: 'Test Co',
        slug: 'test-co',
        cnpj: null,
        description: null,
        logoUrl: null,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        users: [{ role: 'MERCHANT_OWNER', createdAt: new Date() }],
      });

      const result = await service.create('u1', { name: 'Test Co' });

      expect(result.company.name).toBe('Test Co');
      expect(result.membership.role).toBe('MERCHANT_OWNER');
      expect(prisma.company.create).toHaveBeenCalled();
    });

    it('should reject duplicate slug', async () => {
      prisma.company.findMany.mockResolvedValue([{ id: 'existing', slug: 'existing-slug' }]);

      await expect(
        service.create('u1', { name: 'Test', slug: 'existing-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate CNPJ', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.findUnique.mockResolvedValue({ id: 'c2' });

      await expect(
        service.create('u1', { name: 'Test', cnpj: '12345678000199' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return company for member', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.company.findUnique.mockResolvedValue({
        id: 'c1', name: 'Test', slug: 'test', status: 'ACTIVE',
        cnpj: null, description: null, logoUrl: null,
        deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.findById('c1', 'u1');
      expect(result.id).toBe('c1');
    });

    it('should throw for non-member', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(service.findById('c1', 'u2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw for deleted company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.company.findUnique.mockResolvedValue({ deletedAt: new Date() });

      await expect(service.findById('c1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listByUser', () => {
    it('should list companies for user', async () => {
      prisma.userCompany.findMany.mockResolvedValue([
        {
          role: 'MERCHANT_OWNER',
          company: {
            id: 'c1', name: 'Co1', slug: 'co1', status: 'ACTIVE',
            cnpj: null, description: null, logoUrl: null,
            deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
          },
        },
        {
          role: 'MERCHANT_MANAGER',
          company: {
            id: 'c2', name: 'Co2', slug: 'co2', status: 'ACTIVE',
            cnpj: null, description: null, logoUrl: null,
            deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
          },
        },
      ]);

      const result = await service.listByUser('u1');
      expect(result).toHaveLength(2);
    });

    it('should filter out deleted companies', async () => {
      prisma.userCompany.findMany.mockResolvedValue([
        {
          role: 'MERCHANT_OWNER',
          company: { id: 'c1', deletedAt: null, status: 'ACTIVE', name: 'Co1', slug: 'co1', cnpj: null, description: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
        {
          role: 'MERCHANT_OWNER',
          company: { id: 'c2', deletedAt: new Date(), status: 'INACTIVE', name: 'Co2', slug: 'co2', cnpj: null, description: null, logoUrl: null, createdAt: new Date(), updatedAt: new Date() },
        },
      ]);

      const result = await service.listByUser('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('resolveSlug', () => {
    it('should return provided slug if unique', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      const slug = await service.resolveSlug('my-slug', 'My Company');
      expect(slug).toBe('my-slug');
    });

    it('should throw ConflictException if provided slug exists', async () => {
      prisma.company.findMany.mockResolvedValue([{ id: 'other', slug: 'taken' }]);
      await expect(service.resolveSlug('taken', 'My Company')).rejects.toThrow(ConflictException);
    });

    it('should generate slug from name', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      const slug = await service.resolveSlug(undefined, 'Minha Empresa');
      expect(slug).toBe('minha-empresa');
    });

    it('should generate incremental slug on conflict', async () => {
      prisma.company.findMany.mockResolvedValue([{ id: 'existing', slug: 'minha-empresa' }]);
      const slug = await service.resolveSlug(undefined, 'Minha Empresa');
      expect(slug).toBe('minha-empresa-2');
    });

    it('should resolve slug in a single lookup query', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      await service.resolveSlug(undefined, 'Minha Empresa');
      expect(prisma.company.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.company.findUnique).not.toHaveBeenCalled();
    });
  });
});
