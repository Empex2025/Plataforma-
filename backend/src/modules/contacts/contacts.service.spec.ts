import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ContactsService } from './contacts.service.js';
import { PrismaService } from '../../db/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { ContactType } from '../../generated/prisma/enums.js';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: {
    store: { findUnique: jest.Mock };
    contact: { create: jest.Mock; findMany: jest.Mock };
    userCompany: { findUnique: jest.Mock };
  };
  let eventsService: { track: jest.Mock };

  beforeEach(async () => {
    prisma = {
      store: { findUnique: jest.fn() },
      contact: { create: jest.fn(), findMany: jest.fn() },
      userCompany: { findUnique: jest.fn() },
    };
    eventsService = { track: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsService, useValue: eventsService },
      ],
    }).compile();

    service = module.get(ContactsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create contact and track event', async () => {
      prisma.store.findUnique.mockResolvedValue({ id: 'store-1', status: 'ACTIVE', deletedAt: null });

      const contact = { id: 'contact-1', userId: 'user-1', storeId: 'store-1', type: 'WHATSAPP', value: '5511999999999', metadata: null, createdAt: new Date() };
      prisma.contact.create.mockResolvedValue(contact);
      eventsService.track.mockResolvedValue(undefined);

      const result = await service.create('user-1', {
        storeId: 'store-1',
        type: ContactType.WHATSAPP,
        value: '5511999999999',
      });

      expect(result.id).toBe('contact-1');
      expect(result.value).toBe('5511999999999');
    });

    it('should throw NotFoundException for inactive store', async () => {
      prisma.store.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', {
        storeId: 'store-1',
        type: ContactType.WHATSAPP,
        value: '5511999999999',
      })).rejects.toThrow('not found');
    });
  });

  describe('findAll', () => {
    it('should return user contacts', async () => {
      const contacts = [
        { id: 'contact-1', userId: 'user-1', storeId: 'store-1', type: 'WHATSAPP', value: '5511999999999', metadata: null, createdAt: new Date() },
      ];
      prisma.contact.findMany.mockResolvedValue(contacts);

      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
    });
  });
});
