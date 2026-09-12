import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EventsService } from '@/modules/events/events.service.js';
import { CreateContactDto } from '../dto/create-contact.dto.js';
import { ContactResponseDto } from '../dto/contact-response.dto.js';
import { ContactType, EventType } from '@/generated/prisma/enums.js';
import type { InputJsonValue } from '@/generated/prisma/internal/prismaNamespace.js';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, dto: CreateContactDto): Promise<ContactResponseDto> {
    const store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    if (!store || store.status !== 'ACTIVE' || store.deletedAt) {
      throw new NotFoundException('Store not found or inactive');
    }

    const contact = await this.prisma.contact.create({
      data: {
        userId,
        storeId: dto.storeId,
        type: dto.type as ContactType,
        value: dto.value,
        metadata: (dto.metadata as InputJsonValue) ?? undefined,
      },
    });

    const eventType = this.mapContactTypeToEvent(dto.type);
    this.eventsService.track(
      { type: eventType, targetType: 'store', targetId: dto.storeId },
      userId,
    ).catch((err) => this.logger.warn(`Failed to track contact event: ${err}`));

    return ContactResponseDto.fromPlain(contact as unknown as Record<string, unknown>);
  }

  async findAll(userId: string): Promise<ContactResponseDto[]> {
    const contacts = await this.prisma.contact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return contacts.map((c) => ContactResponseDto.fromPlain(c as unknown as Record<string, unknown>));
  }

  async findByStore(storeId: string, userId: string): Promise<ContactResponseDto[]> {
    await this.validateStoreMembership(storeId, userId);

    const contacts = await this.prisma.contact.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    });

    return contacts.map((c) => ContactResponseDto.fromPlain(c as unknown as Record<string, unknown>));
  }

  private mapContactTypeToEvent(type: string): EventType {
    switch (type) {
      case ContactType.WHATSAPP: return EventType.WHATSAPP_CLICK;
      case ContactType.PHONE: return EventType.PHONE_CLICK;
      default: return EventType.WHATSAPP_CLICK;
    }
  }

  private async validateStoreMembership(storeId: string, userId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const membership = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId: store.companyId },
      },
    });

    if (!membership) {
      throw new NotFoundException('Store not found');
    }
  }
}
