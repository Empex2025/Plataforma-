import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { CreateInventoryDto } from '../dto/create-inventory.dto.js';
import { UpdateInventoryDto } from '../dto/update-inventory.dto.js';
import { InventoryResponseDto } from '../dto/inventory-response.dto.js';
import { SearchIndexQueue } from '@/modules/search/queues/search-index-queue.js';
import { AlertsQueue } from '@/modules/alerts/alerts.queue.js';
import { NotificationService } from '@/modules/notifications/services/notification.service.js';
import { NotificationType } from '@/modules/notifications/notification.types.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly searchIndexQueue: SearchIndexQueue,
    private readonly alertsQueue: AlertsQueue,
    private readonly notificationService: NotificationService,
  ) {}

  async upsert(
    companyId: string,
    userId: string,
    dto: CreateInventoryDto,
  ): Promise<InventoryResponseDto> {
    await this.validateMembership(companyId, userId);

    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store || store.companyId !== companyId) {
      throw new ForbiddenException('Store does not belong to this company');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product || product.companyId !== companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    if (dto.quantity < 0) {
      throw new BadRequestException('Quantity must be non-negative');
    }

    const previousInventory = await this.prisma.inventory.findUnique({
      where: { storeId_productId: { storeId: dto.storeId, productId: dto.productId } },
      select: { quantity: true },
    });

    const inventory = await this.prisma.inventory.upsert({
      where: {
        storeId_productId: { storeId: dto.storeId, productId: dto.productId },
      },
      update: { quantity: dto.quantity },
      create: {
        storeId: dto.storeId,
        productId: dto.productId,
        quantity: dto.quantity,
      },
    });

    await this.searchIndexQueue.indexProduct(dto.productId);
    await this.alertsQueue.evaluate({
      storeId: dto.storeId,
      productId: dto.productId,
      quantity: inventory.quantity,
    });

    if (inventory.quantity > 0) {
      const previousQuantity = previousInventory?.quantity ?? 0;
      if (previousQuantity === 0) {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
          select: { name: true },
        });
        const productName = product?.name ?? 'Produto';
        await this.notificationService.notifyFavoriteUsers(
          'PRODUCT',
          dto.productId,
          NotificationType.BACK_IN_STOCK,
          'Produto voltou ao estoque',
          `${productName} voltou ao estoque.`,
          [companyId],
        ).catch((err: unknown) => this.logger.warn(`Failed to notify favorite users for back-in-stock: ${err}`));
      }
    }

    return InventoryResponseDto.fromPlain(inventory);
  }

  async updateQuantity(
    companyId: string,
    userId: string,
    productId: string,
    storeId: string,
    dto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    await this.validateMembership(companyId, userId);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.companyId !== companyId) {
      throw new ForbiddenException('Store does not belong to this company');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.companyId !== companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    if (dto.quantity < 0) {
      throw new BadRequestException('Quantity must be non-negative');
    }

    const existing = await this.prisma.inventory.findUnique({
      where: { storeId_productId: { storeId, productId } },
    });

    if (!existing) {
      throw new NotFoundException('Inventory record not found');
    }

    const inventory = await this.prisma.inventory.update({
      where: { storeId_productId: { storeId, productId } },
      data: { quantity: dto.quantity },
    });

    await this.searchIndexQueue.indexProduct(productId);
    await this.alertsQueue.evaluate({
      storeId,
      productId,
      quantity: inventory.quantity,
    });

    if (inventory.quantity > 0 && existing.quantity === 0) {
      const productForName = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { name: true },
      });
      const productName = productForName?.name ?? 'Produto';
      await this.notificationService.notifyFavoriteUsers(
        'PRODUCT',
        productId,
        NotificationType.BACK_IN_STOCK,
        'Produto voltou ao estoque',
        `${productName} voltou ao estoque.`,
        [companyId],
      ).catch((err: unknown) => this.logger.warn(`Failed to notify favorite users for back-in-stock: ${err}`));
    }

    return InventoryResponseDto.fromPlain(inventory);
  }

  async findByStoreAndProduct(
    companyId: string,
    userId: string,
    productId: string,
    storeId: string,
  ): Promise<InventoryResponseDto> {
    await this.validateMembership(companyId, userId);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.companyId !== companyId) {
      throw new ForbiddenException('Store does not belong to this company');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.companyId !== companyId) {
      throw new ForbiddenException('Product does not belong to this company');
    }

    const inventory = await this.prisma.inventory.findUnique({
      where: { storeId_productId: { storeId, productId } },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory record not found');
    }

    return InventoryResponseDto.fromPlain(inventory);
  }

  async listByCompany(
    companyId: string,
    userId: string,
    filters?: { storeId?: string; productId?: string },
  ): Promise<InventoryResponseDto[]> {
    await this.validateMembership(companyId, userId);

    const where: Record<string, unknown> = {};

    if (filters?.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: filters.storeId },
      });
      if (!store || store.companyId !== companyId) {
        throw new ForbiddenException('Store does not belong to this company');
      }
      where.storeId = filters.storeId;
    }

    if (filters?.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: filters.productId },
      });
      if (!product || product.companyId !== companyId) {
        throw new ForbiddenException('Product does not belong to this company');
      }
      where.productId = filters.productId;
    }

    const inventories = await this.prisma.inventory.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return inventories.map((inv) => InventoryResponseDto.fromPlain(inv));
  }

  private async validateMembership(companyId: string, userId: string) {
    const userCompany = await this.prisma.userCompany.findUnique({
      where: {
        userId_companyId: { userId, companyId },
      },
    });

    if (!userCompany) {
      throw new ForbiddenException('User does not belong to this company');
    }

    return userCompany;
  }
}
