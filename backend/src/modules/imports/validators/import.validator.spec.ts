import { ImportValidator } from './import.validator.js';
import { NormalizedImportRow } from '../imports.types.js';

describe('ImportValidator', () => {
  let validator: ImportValidator;

  beforeEach(() => {
    validator = new ImportValidator();
  });

  function makeRow(overrides: Partial<NormalizedImportRow> = {}): NormalizedImportRow {
    return { lineNumber: 2, ...overrides };
  }

  describe('validate', () => {
    it('should pass valid row', () => {
      const row = makeRow({
        product: { name: 'Widget' },
        price: { value: 19.9 },
        inventory: { quantity: 10 },
      });

      const errors = validator.validate(row);

      expect(errors).toHaveLength(0);
    });

    it('should catch missing product name', () => {
      const row = makeRow({
        product: { name: '' },
      });

      const errors = validator.validate(row);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('REQUIRED_FIELD');
      expect(errors[0].field).toBe('product_name');
    });

    it('should catch negative price', () => {
      const row = makeRow({
        price: { value: -5 },
      });

      const errors = validator.validate(row);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_DECIMAL');
      expect(errors[0].field).toBe('price');
    });

    it('should catch negative quantity', () => {
      const row = makeRow({
        inventory: { quantity: -1 },
      });

      const errors = validator.validate(row);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_QUANTITY');
      expect(errors[0].field).toBe('stock');
    });
  });

  describe('validateCategoryExists', () => {
    it('should catch non-existent category', () => {
      const row = makeRow({
        category: { slug: 'unknown-cat' },
      });
      const categorySlugs = new Set(['electronics', 'clothing']);

      const errors = validator.validateCategoryExists(row, categorySlugs);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('CATEGORY_NOT_FOUND');
      expect(errors[0].value).toBe('unknown-cat');
    });
  });

  describe('validateStoreBelongsToCompany', () => {
    it('should catch non-existent store', () => {
      const row = makeRow({
        store: { slug: 'unknown-store' },
      });
      const storeSlugs = new Set(['store-1', 'store-2']);

      const errors = validator.validateStoreBelongsToCompany(row, storeSlugs);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('STORE_NOT_FOUND');
      expect(errors[0].value).toBe('unknown-store');
    });
  });

  describe('validatePriceDates', () => {
    it('should catch invalid dates (validTo before validFrom)', () => {
      const row = makeRow({
        price: {
          value: 10,
          validFrom: new Date('2025-12-31'),
          validTo: new Date('2025-01-01'),
        },
      });

      const errors = validator.validatePriceDates(row);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('INVALID_DATE');
      expect(errors[0].field).toBe('valid_to');
    });
  });
});
