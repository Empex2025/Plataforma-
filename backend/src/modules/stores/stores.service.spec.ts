import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { StoresService } from './stores.service.js';

describe('StoresService', () => {
  let service: StoresService;
  let prisma: {
    userCompany: { findUnique: jest.Mock };
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      userCompany: { findUnique: jest.fn() },
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
    };
    service = new StoresService(prisma as never);
  });

  describe('create', () => {
    it('should create store with coordinates', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{
        id: 's1', company_id: 'c1', name: 'Store 1', slug: 'store-1',
        description: null, phone: null, whatsapp: null, email: null,
        address: null, address_num: null, complement: null,
        neighborhood: null, city: null, state: null, zip_code: null,
        country: 'BR', lat: -23.55, lng: -46.63, status: 'ACTIVE',
        created_at: new Date(), updated_at: new Date(),
      }]);

      const result = await service.create('c1', 'u1', {
        name: 'Store 1', lat: -23.55, lng: -46.63,
      });

      expect(result.name).toBe('Store 1');
      expect(result.lat).toBe(-23.55);
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should reject non-member', async () => {
      prisma.userCompany.findUnique.mockResolvedValue(null);

      await expect(
        service.create('c1', 'u2', { name: 'Store', lat: 0, lng: 0 }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listByCompany', () => {
    it('should list stores for company', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 's1', company_id: 'c1', name: 'Store 1', slug: 'store-1',
          description: null, phone: null, whatsapp: null, email: null,
          address: null, address_num: null, complement: null,
          neighborhood: null, city: null, state: null, zip_code: null,
          country: 'BR', lat: -23.55, lng: -46.63, status: 'ACTIVE',
          created_at: new Date(), updated_at: new Date(),
        },
      ]);

      const result = await service.listByCompany('c1', 'u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('deactivate', () => {
    it('should deactivate store', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.$queryRaw.mockResolvedValue([{ id: 's1', deleted_at: null }]);

      await service.deactivate('c1', 's1', 'u1');
      expect(prisma.$executeRaw).toHaveBeenCalled();
    });

    it('should throw for non-existent store', async () => {
      prisma.userCompany.findUnique.mockResolvedValue({ userId: 'u1', companyId: 'c1' });
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.deactivate('c1', 's1', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveStoreSlug', () => {
    it('should return unique slug', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const slug = await service.resolveStoreSlug(undefined, 'Minha Loja', 'c1');
      expect(slug).toBe('minha-loja');
    });

    it('should increment slug on conflict', async () => {
      prisma.$queryRaw
        .mockResolvedValueOnce([{ slug: 'minha-loja' }])
        .mockResolvedValueOnce([]);
      const slug = await service.resolveStoreSlug(undefined, 'Minha Loja', 'c1');
      expect(slug).toBe('minha-loja-2');
    });

    it('should throw ConflictException for user-provided slug conflict', async () => {
      prisma.$queryRaw.mockResolvedValue([{ slug: 'taken' }]);
      await expect(service.resolveStoreSlug('taken', 'Minha Loja', 'c1')).rejects.toThrow(ConflictException);
    });
  });
});
