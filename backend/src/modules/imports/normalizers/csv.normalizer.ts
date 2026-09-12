import { Injectable } from '@nestjs/common';
import { NormalizedImportRow, RawImportRow } from '../imports.types.js';
import { ProductStatus, PriceType } from '@/generated/prisma/enums.js';

@Injectable()
export class CsvNormalizer {
  normalize(row: RawImportRow): NormalizedImportRow {
    const d = row.data;
    
    const result: NormalizedImportRow = {
      lineNumber: row.lineNumber,
    };

    // Product
    if (d.product_name) {
      result.product = {
        name: this.normalizeText(d.product_name),
        sku: d.sku ? this.normalizeSku(d.sku) : undefined,
        barcode: d.barcode?.trim() || undefined,
        description: d.description?.trim() || undefined,
        status: this.normalizeEnum(d.status, Object.values(ProductStatus)) as ProductStatus | undefined,
      };
    }

    // Brand
    if (d.brand_name || d.brand_slug) {
      result.brand = {
        name: d.brand_name?.trim() || undefined,
        slug: d.brand_slug ? this.normalizeSlug(d.brand_slug) : undefined,
      };
      // Auto-generate slug from name if not provided
      if (result.brand.name && !result.brand.slug) {
        result.brand.slug = this.normalizeSlug(result.brand.name);
      }
    }

    // Category
    if (d.category_slug) {
      result.category = {
        slug: this.normalizeSlug(d.category_slug),
      };
    }

    // Store
    if (d.store_slug) {
      result.store = {
        slug: this.normalizeSlug(d.store_slug),
      };
    }

    // Price
    if (d.price) {
      const priceValue = this.normalizeDecimal(d.price);
      if (priceValue !== undefined) {
        result.price = {
          value: priceValue,
          type: this.normalizeEnum(d.price_type, Object.values(PriceType)) as PriceType | undefined,
          validFrom: d.valid_from ? this.normalizeDate(d.valid_from) : undefined,
          validTo: d.valid_to ? this.normalizeDate(d.valid_to) : undefined,
        };
      }
    }

    // Inventory
    if (d.stock !== undefined && d.stock !== '') {
      const quantity = this.normalizeInteger(d.stock);
      if (quantity !== undefined) {
        result.inventory = { quantity };
      }
    }

    return result;
  }

  private normalizeText(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeSku(value: string): string {
    return value.trim().toUpperCase();
  }

  private normalizeSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private normalizeDecimal(value: string): number | undefined {
    if (!value) return undefined;
    // Replace comma with dot for decimal
    const normalized = value.replace(',', '.').trim();
    const num = parseFloat(normalized);
    return isNaN(num) ? undefined : num;
  }

  private normalizeInteger(value: string): number | undefined {
    if (!value) return undefined;
    const num = parseInt(value.trim(), 10);
    return isNaN(num) ? undefined : num;
  }

  private normalizeDate(value: string): Date | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    
    // Try DD/MM/YYYY format
    const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return isNaN(date.getTime()) ? undefined : date;
    }

    // Try ISO format
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? undefined : date;
  }

  private normalizeEnum<T extends string>(value: string | undefined, validValues: T[]): T | undefined {
    if (!value) return undefined;
    const upper = value.trim().toUpperCase() as T;
    return validValues.includes(upper) ? upper : undefined;
  }
}
