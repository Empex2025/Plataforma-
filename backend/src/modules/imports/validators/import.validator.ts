import { Injectable } from '@nestjs/common';
import { NormalizedImportRow, ImportError } from '../imports.types.js';

@Injectable()
export class ImportValidator {
  validate(row: NormalizedImportRow): ImportError[] {
    const errors: ImportError[] = [];

    // Product validation
    if (row.product) {
      if (!row.product.name || row.product.name.trim() === '') {
        errors.push({
          line: row.lineNumber,
          field: 'product_name',
          code: 'REQUIRED_FIELD',
          message: 'Product name is required',
        });
      }
    }

    // Price validation
    if (row.price) {
      if (row.price.value !== undefined && row.price.value < 0) {
        errors.push({
          line: row.lineNumber,
          field: 'price',
          code: 'INVALID_DECIMAL',
          message: 'Price must be non-negative',
          value: String(row.price.value),
        });
      }
    }

    // Inventory validation
    if (row.inventory) {
      if (row.inventory.quantity !== undefined && row.inventory.quantity < 0) {
        errors.push({
          line: row.lineNumber,
          field: 'stock',
          code: 'INVALID_QUANTITY',
          message: 'Stock quantity must be non-negative',
          value: String(row.inventory.quantity),
        });
      }
    }

    return errors;
  }

  validateCategoryExists(row: NormalizedImportRow, categorySlugs: Set<string>): ImportError[] {
    const errors: ImportError[] = [];
    
    if (row.category?.slug && !categorySlugs.has(row.category.slug)) {
      errors.push({
        line: row.lineNumber,
        field: 'category_slug',
        code: 'CATEGORY_NOT_FOUND',
        message: `Category with slug '${row.category.slug}' not found`,
        value: row.category.slug,
      });
    }

    return errors;
  }

  validateStoreBelongsToCompany(row: NormalizedImportRow, storeSlugs: Set<string>): ImportError[] {
    const errors: ImportError[] = [];
    
    if (row.store?.slug && !storeSlugs.has(row.store.slug)) {
      errors.push({
        line: row.lineNumber,
        field: 'store_slug',
        code: 'STORE_NOT_FOUND',
        message: `Store with slug '${row.store.slug}' not found or does not belong to this company`,
        value: row.store.slug,
      });
    }

    return errors;
  }

  validatePriceDates(row: NormalizedImportRow): ImportError[] {
    const errors: ImportError[] = [];
    
    if (row.price?.validFrom && row.price?.validTo) {
      if (row.price.validTo < row.price.validFrom) {
        errors.push({
          line: row.lineNumber,
          field: 'valid_to',
          code: 'INVALID_DATE',
          message: 'validTo must be after validFrom',
        });
      }
    }

    return errors;
  }
}
