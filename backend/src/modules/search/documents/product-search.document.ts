export interface ProductSearchDocument {
  id: string;
  companyId: string;
  name: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryIds: string[];
  categoryNames: string[];
  tagIds: string[];
  tagNames: string[];
  tagSlugs: string[];
  storeIds: string[];
  storeNames: string[];
  cities: string[];
  states: string[];
  minPrice: number | null;
  maxPrice: number | null;
  hasStock: boolean;
  active: boolean;
  updatedAt: string;
}
