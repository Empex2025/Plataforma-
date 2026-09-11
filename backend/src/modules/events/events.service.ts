import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { EventResponseDto } from './dto/event-response.dto.js';
import { QueryEventsDto } from './dto/query-events.dto.js';
import { EventType } from '../../generated/prisma/enums.js';
import type { InputJsonValue } from '../../generated/prisma/internal/prismaNamespace.js';

const MAX_METADATA_SIZE_BYTES = 10240;
const MAX_STRING_VALUE_LENGTH = 500;
const MAX_METADATA_DEPTH = 3;
const MAX_QUERY_LIMIT = 100;
const DEFAULT_QUERY_LIMIT = 20;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track an event. Accepts authenticated or anonymous users.
   * Validates metadata size and structure.
   */
  async track(dto: CreateEventDto, userId?: string | null): Promise<EventResponseDto> {
    this.validateMetadata(dto.metadata);

    const event = await this.prisma.event.create({
      data: {
        type: dto.type as EventType,
        userId: userId ?? null,
        sessionId: dto.sessionId ?? null,
        targetType: dto.targetType ?? null,
        targetId: dto.targetId ?? null,
        metadata: (dto.metadata as InputJsonValue) ?? undefined,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
      },
    });

    return EventResponseDto.fromPlain(event as unknown as Record<string, unknown>);
  }

  /**
   * Query events with filters. Used for user's own events or admin debugging.
   */
  async findAll(userId: string, query: QueryEventsDto): Promise<EventResponseDto[]> {
    const limit = Math.min(query.limit ?? DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT);
    const offset = query.offset ?? 0;

    const where: Record<string, unknown> = { userId };

    if (query.type) where.type = query.type;
    if (query.targetType) where.targetType = query.targetType;
    if (query.targetId) where.targetId = query.targetId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return events.map((e) => EventResponseDto.fromPlain(e as unknown as Record<string, unknown>));
  }

  /**
   * Validate metadata: size, string lengths, depth.
   */
  private validateMetadata(metadata: Record<string, unknown> | undefined): void {
    if (!metadata) return;

    const serialized = JSON.stringify(metadata);
    if (serialized.length > MAX_METADATA_SIZE_BYTES) {
      throw new BadRequestException(`Metadata exceeds maximum size of ${MAX_METADATA_SIZE_BYTES} bytes`);
    }

    this.validateMetadataDepth(metadata, 0);
  }

  private validateMetadataDepth(obj: Record<string, unknown>, depth: number): void {
    if (depth > MAX_METADATA_DEPTH) {
      throw new BadRequestException(`Metadata exceeds maximum depth of ${MAX_METADATA_DEPTH}`);
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key.length > MAX_STRING_VALUE_LENGTH) {
        throw new BadRequestException(`Metadata key exceeds maximum length of ${MAX_STRING_VALUE_LENGTH}`);
      }

      if (typeof value === 'string' && value.length > MAX_STRING_VALUE_LENGTH) {
        throw new BadRequestException(`Metadata string value exceeds maximum length of ${MAX_STRING_VALUE_LENGTH}`);
      }

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.validateMetadataDepth(value as Record<string, unknown>, depth + 1);
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            this.validateMetadataDepth(item as Record<string, unknown>, depth + 1);
          }
        }
      }
    }
  }
}
