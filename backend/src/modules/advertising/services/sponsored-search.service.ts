import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/db/prisma.service.js';
import { EligibilityService, EligibilityContext } from './eligibility.service.js';
import { SPONSORED_RESULTS_LIMIT } from '../advertising.constants.js';

export interface SponsoredProductHit {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  campaignId: string;
  campaignName: string;
  weight: number;
  placementType: 'SPONSORED';
  isSponsored: true;
}

export interface SponsoredStoreHit {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  campaignId: string;
  campaignName: string;
  weight: number;
  placementType: 'SPONSORED';
  isSponsored: true;
}

@Injectable()
export class SponsoredSearchService {
  private readonly logger = new Logger(SponsoredSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: EligibilityService,
  ) {}

  /**
   * Find eligible sponsored products for a search query.
   */
  async findSponsoredProducts(
    context: EligibilityContext,
    limit: number = SPONSORED_RESULTS_LIMIT,
  ): Promise<SponsoredProductHit[]> {
    try {
      const eligible = await this.eligibilityService.findEligibleSponsoredItems({
        ...context,
        targetType: 'product',
      });

      const productItems = eligible.filter((e) => e.targetType === 'product');
      if (productItems.length === 0) return [];

      const productIds = productItems.map((e) => e.targetId);
      const products = await this.prisma.product.findMany({
        where: {
          id: { in: productIds },
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          slug: true,
        },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      return productItems
        .filter((item) => productMap.has(item.targetId))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, limit)
        .map((item) => {
          const product = productMap.get(item.targetId)!;
          return {
            id: product.id,
            companyId: product.companyId,
            name: product.name,
            slug: product.slug,
            campaignId: item.campaignId,
            campaignName: item.campaignName,
            weight: item.weight,
            placementType: 'SPONSORED' as const,
            isSponsored: true as const,
          };
        });
    } catch (error) {
      this.logger.warn(`Failed to find sponsored products: ${error}`);
      return [];
    }
  }

  /**
   * Find eligible sponsored stores for a search query.
   */
  async findSponsoredStores(
    context: EligibilityContext,
    limit: number = SPONSORED_RESULTS_LIMIT,
  ): Promise<SponsoredStoreHit[]> {
    try {
      const eligible = await this.eligibilityService.findEligibleSponsoredItems({
        ...context,
        targetType: 'store',
      });

      const storeItems = eligible.filter((e) => e.targetType === 'store');
      if (storeItems.length === 0) return [];

      const storeIds = storeItems.map((e) => e.targetId);
      const stores = await this.prisma.store.findMany({
        where: {
          id: { in: storeIds },
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          slug: true,
        },
      });

      const storeMap = new Map(stores.map((s) => [s.id, s]));

      return storeItems
        .filter((item) => storeMap.has(item.targetId))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, limit)
        .map((item) => {
          const store = storeMap.get(item.targetId)!;
          return {
            id: store.id,
            companyId: store.companyId,
            name: store.name,
            slug: store.slug,
            campaignId: item.campaignId,
            campaignName: item.campaignName,
            weight: item.weight,
            placementType: 'SPONSORED' as const,
            isSponsored: true as const,
          };
        });
    } catch (error) {
      this.logger.warn(`Failed to find sponsored stores: ${error}`);
      return [];
    }
  }
}
