import { Injectable } from '@nestjs/common';
import { NormalizedImportRow, ImportError } from '../imports.types.js';

@Injectable()
export class ImportValidator {
  validate(row: NormalizedImportRow): ImportError[] {
    const errors: ImportError[] = [];

    if (row.product) {
      if (!row.product.name || row.product.name.trim() === '') {
        errors.push({
          line: row.lineNumber,
          field: 'product_name',
          code: 'REQUIRED_FIELD',
          message: 'O nome do produto é obrigatório',
        });
      }
    }

    if (row.price) {
      if (row.price.value !== undefined && row.price.value < 0) {
        errors.push({
          line: row.lineNumber,
          field: 'price',
          code: 'INVALID_DECIMAL',
          message: 'O preço deve ser maior ou igual a zero',
          value: String(row.price.value),
        });
      }
    }

    if (row.inventory) {
      if (row.inventory.quantity !== undefined && row.inventory.quantity < 0) {
        errors.push({
          line: row.lineNumber,
          field: 'stock',
          code: 'INVALID_QUANTITY',
          message: 'A quantidade em estoque deve ser maior ou igual a zero',
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
        message: `Categoria com slug '${row.category.slug}' não encontrada`,
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
        message: `Loja com slug '${row.store.slug}' não encontrada ou não pertence a esta empresa`,
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
          message: 'validTo deve ser posterior a validFrom',
        });
      }
    }

    return errors;
  }
}
