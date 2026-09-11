import type { ProductSearchDocument } from '../documents/product-search.document.js';
import type { StoreSearchDocument } from '../documents/store-search.document.js';

export type AutocompleteType = 'product' | 'store' | 'category' | 'brand';

export interface ProductSearchQuery {
  term: string;
  companyId?: string;
  categoryId?: string;
  brandId?: string;
  storeId?: string;
  city?: string;
  state?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: string;
  page: number;
  limit: number;
}

export interface ProductSearchResult {
  hits: ProductSearchDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StoreSearchQuery {
  term: string;
  companyId?: string;
  city?: string;
  state?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: string;
  page: number;
  limit: number;
}

export interface StoreSearchResult {
  hits: StoreSearchDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AutocompleteResult {
  id: string;
  type: AutocompleteType;
  label: string;
  subtitle: string | null;
}

export interface ISearchProvider {
  searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult>;
  searchStores(query: StoreSearchQuery): Promise<StoreSearchResult>;
  autocomplete(term: string, type: AutocompleteType | null, limit: number): Promise<AutocompleteResult[]>;

  indexProduct(doc: ProductSearchDocument): Promise<void>;
  indexStore(doc: StoreSearchDocument): Promise<void>;
  deleteProduct(id: string): Promise<void>;
  deleteStore(id: string): Promise<void>;

  reindexProducts(docs: ProductSearchDocument[]): Promise<void>;
  reindexStores(docs: StoreSearchDocument[]): Promise<void>;

  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}
