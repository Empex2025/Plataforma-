import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Meilisearch } from 'meilisearch';
import type { Settings } from 'meilisearch';
import type {
  ISearchProvider,
  ProductSearchQuery,
  ProductSearchResult,
  ProductSearchHit,
  StoreSearchQuery,
  StoreSearchResult,
  StoreSearchHit,
  AutocompleteResult,
  AutocompleteType,
} from './search-provider.interface.js';
import type { ProductSearchDocument } from '../documents/product-search.document.js';
import type { StoreSearchDocument } from '../documents/store-search.document.js';
import { PRODUCTS_INDEX, STORES_INDEX, CATEGORIES_INDEX } from '../search.constants.js';
import { filterLiteral } from '../helpers/search-filter.js';

@Injectable()
export class MeilisearchProvider implements ISearchProvider, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MeilisearchProvider.name);
  private client: Meilisearch;

  constructor() {
    this.client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY ?? undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  async initialize(): Promise<void> {
    try {
      await this.ensureIndex(PRODUCTS_INDEX, {
        searchableAttributes: ['name', 'brandName', 'categoryNames', 'tagNames', 'sku', 'barcode', 'description'],
        filterableAttributes: [
          'companyId', 'brandId', 'categoryIds', 'tagIds', 'tagSlugs', 'storeIds',
          'active', 'hasStock', 'cities', 'states',
          'minPrice', 'maxPrice',
        ],
        sortableAttributes: ['minPrice', 'maxPrice', 'updatedAt'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      });

      await this.ensureIndex(STORES_INDEX, {
        searchableAttributes: ['name', 'description', 'city', 'neighborhood'],
        filterableAttributes: ['companyId', 'active', 'city', 'state', 'categoryNames', '_geo'],
        sortableAttributes: ['updatedAt', '_geo'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      });

      await this.ensureIndex(CATEGORIES_INDEX, {
        searchableAttributes: ['name'],
      });

      this.logger.log('Meilisearch indices configured');
    } catch (error) {
      this.logger.warn(`Meilisearch initialization failed: ${error}`);
    }
  }

  private async ensureIndex(uid: string, settings: Settings): Promise<void> {
    let primaryKeyReady = false;

    try {
      const index = await this.client.getIndex(uid);
      primaryKeyReady = index.primaryKey === 'id';
    } catch {
      primaryKeyReady = false;
    }

    if (!primaryKeyReady) {
      try {
        const createTask = await this.client.createIndex(uid, { primaryKey: 'id' });
        await this.client.tasks.waitForTask(createTask.taskUid);
      } catch {
        try {
          const updateTask = await this.client.updateIndex(uid, { primaryKey: 'id' });
          await this.client.tasks.waitForTask(updateTask.taskUid);
        } catch {
        }
      }
    }

    await this.client.index(uid).updateSettings(settings).catch(() => undefined);
  }

  async shutdown(): Promise<void> {
    this.logger.log('Meilisearch provider shutdown');
  }

  async health(): Promise<boolean> {
    try {
      await this.client.health();
      return true;
    } catch {
      return false;
    }
  }

  async searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const filters: string[] = [];

    if (query.companyId) filters.push(`companyId = ${filterLiteral(query.companyId)}`);
    if (query.brandId) filters.push(`brandId = ${filterLiteral(query.brandId)}`);
    if (query.categoryId) filters.push(`categoryIds = ${filterLiteral(query.categoryId)}`);
    if (query.storeId) filters.push(`storeIds = ${filterLiteral(query.storeId)}`);
    if (query.tagSlug) filters.push(`tagSlugs = ${filterLiteral(query.tagSlug)}`);
    if (query.city) filters.push(`cities = ${filterLiteral(query.city)}`);
    if (query.state) filters.push(`states = ${filterLiteral(query.state)}`);
    if (query.inStock !== undefined) filters.push(`hasStock = ${query.inStock}`);
    if (query.minPrice !== undefined) filters.push(`minPrice >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) filters.push(`maxPrice <= ${query.maxPrice}`);

    const index = this.client.index(PRODUCTS_INDEX);
    const result = await index.search<ProductSearchDocument>(query.term, {
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    const hits: ProductSearchHit[] = result.hits.map((hit) => ({
      ...hit,
      _sponsored: undefined,
    }));

    return {
      hits,
      total: result.estimatedTotalHits ?? result.hits.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil((result.estimatedTotalHits ?? result.hits.length) / query.limit),
    };
  }

  async searchStores(query: StoreSearchQuery): Promise<StoreSearchResult> {
    const filters: string[] = [];

    if (query.companyId) filters.push(`companyId = ${filterLiteral(query.companyId)}`);
    if (query.city) filters.push(`city = ${filterLiteral(query.city)}`);
    if (query.state) filters.push(`state = ${filterLiteral(query.state)}`);
    if (query.category) filters.push(`categoryNames = ${filterLiteral(query.category)}`);
    filters.push('active = true');

    const sort: string[] = [];
    if (query.sort === 'distance' && query.lat !== undefined && query.lng !== undefined) {
      sort.push(`_geoPoint(${query.lat},${query.lng}):asc`);
    } else if (query.sort === 'updated') {
      sort.push('updatedAt:desc');
    }

    const index = this.client.index(STORES_INDEX);
    const result = await index.search<StoreSearchDocument>(query.term, {
      filter: filters.length > 0 ? filters.join(' AND ') : undefined,
      sort: sort.length > 0 ? sort : undefined,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    const hits: StoreSearchHit[] = result.hits.map((hit) => ({
      ...hit,
      _sponsored: undefined,
    }));

    return {
      hits,
      total: result.estimatedTotalHits ?? result.hits.length,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil((result.estimatedTotalHits ?? result.hits.length) / query.limit),
    };
  }

  async autocomplete(term: string, type: AutocompleteType | null, limit: number): Promise<AutocompleteResult[]> {
    const results: AutocompleteResult[] = [];

    const searchIndex = async (indexName: string, itemType: AutocompleteType, labelField: string, subtitleField?: string) => {
      const index = this.client.index(indexName);
      const result = await index.search(term, { limit });
      for (const hit of result.hits) {
        results.push({
          id: (hit as Record<string, unknown>).id as string,
          type: itemType,
          label: (hit as Record<string, unknown>)[labelField] as string,
          subtitle: subtitleField ? ((hit as Record<string, unknown>)[subtitleField] as string | null) : null,
        });
      }
    };

    if (!type || type === 'product') await searchIndex(PRODUCTS_INDEX, 'product', 'name', 'brandName');
    if (!type || type === 'store') await searchIndex(STORES_INDEX, 'store', 'name', 'city');
    if (!type || type === 'category') {
      const index = this.client.index(CATEGORIES_INDEX);
      const result = await index.search(term, { limit });
      for (const hit of result.hits) {
        results.push({
          id: (hit as Record<string, unknown>).id as string,
          type: 'category',
          label: (hit as Record<string, unknown>).name as string,
          subtitle: null,
        });
      }
    }

    return results.slice(0, limit);
  }

  async indexProduct(doc: ProductSearchDocument): Promise<void> {
    const index = this.client.index(PRODUCTS_INDEX);
    await index.updateDocuments([doc]);
  }

  async indexStore(doc: StoreSearchDocument): Promise<void> {
    const index = this.client.index(STORES_INDEX);
    await index.updateDocuments([doc]);
  }

  async deleteProduct(id: string): Promise<void> {
    const index = this.client.index(PRODUCTS_INDEX);
    await index.deleteDocument(id);
  }

  async deleteStore(id: string): Promise<void> {
    const index = this.client.index(STORES_INDEX);
    await index.deleteDocument(id);
  }

  async reindexProducts(docs: ProductSearchDocument[]): Promise<void> {
    const index = this.client.index(PRODUCTS_INDEX);
    await index.updateDocuments(docs);
  }

  async reindexStores(docs: StoreSearchDocument[]): Promise<void> {
    const index = this.client.index(STORES_INDEX);
    await index.updateDocuments(docs);
  }
}
