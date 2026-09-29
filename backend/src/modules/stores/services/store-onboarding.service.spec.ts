import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { StoreOnboardingService } from './store-onboarding.service.js';
import { StoresService } from './stores.service.js';
import { PrismaService } from '@/db/prisma.service.js';

describe('StoreOnboardingService', () => {
  let service: StoreOnboardingService;
  let prisma: {
    userCompany: { findFirst: jest.Mock; create: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
    company: { create: jest.Mock; findUnique: jest.Mock };
    store: { update: jest.Mock };
    storeHour: { createMany: jest.Mock };
  };
  let stores: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      userCompany: { findFirst: jest.fn(), create: jest.fn() },
      user: { findUniqueOrThrow: jest.fn() },
      company: { create: jest.fn(), findUnique: jest.fn() },
      store: { update: jest.fn() },
      storeHour: { createMany: jest.fn() },
    };
    stores = { create: jest.fn().mockResolvedValue({ id: 'store-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreOnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: StoresService, useValue: stores },
      ],
    }).compile();

    service = module.get(StoreOnboardingService);
  });

  it('reuses the existing company of the user', async () => {
    prisma.userCompany.findFirst.mockResolvedValue({ companyId: 'company-1' });

    await service.create('user-1', {
      name: 'Loja',
      lat: 1,
      lng: 2,
      cityState: 'São Paulo-SP',
    });

    expect(stores.create).toHaveBeenCalledWith(
      'company-1',
      'user-1',
      expect.objectContaining({ name: 'Loja', city: 'São Paulo', state: 'SP' }),
    );
  });

  it('persists media and opening hours when provided', async () => {
    prisma.userCompany.findFirst.mockResolvedValue({ companyId: 'company-1' });

    const result = await service.create('user-1', {
      name: 'Loja',
      lat: 1,
      lng: 2,
      instagram: '@sualoja',
      logoUrl: 'https://cdn.example.com/logo.png',
      hours: [{ days: ['Seg', 'Ter'], start: '09:00', end: '18:00' }],
    });

    expect(prisma.store.update).toHaveBeenCalledTimes(1);
    expect(prisma.storeHour.createMany).toHaveBeenCalledTimes(1);
    expect(result.instagram).toBe('@sualoja');
    expect(result.hours).toHaveLength(1);
  });

  it('creates a company when the user has none', async () => {
    prisma.userCompany.findFirst.mockResolvedValue(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      name: 'Autônomo',
      personType: 'PF',
      document: '52998224725',
    });
    prisma.company.findUnique.mockResolvedValue(null);
    prisma.company.create.mockResolvedValue({ id: 'company-2' });
    prisma.userCompany.create.mockResolvedValue({});

    await service.create('user-1', { name: 'Loja', lat: 1, lng: 2 });

    expect(prisma.company.create).toHaveBeenCalledTimes(1);
    expect(prisma.userCompany.create).toHaveBeenCalledTimes(1);
    expect(stores.create).toHaveBeenCalledWith(
      'company-2',
      'user-1',
      expect.any(Object),
    );
  });
});
