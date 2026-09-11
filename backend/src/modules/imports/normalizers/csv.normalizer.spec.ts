import { CsvNormalizer } from './csv.normalizer.js';
import { RawImportRow } from '../imports.types.js';

describe('CsvNormalizer', () => {
  let normalizer: CsvNormalizer;

  beforeEach(() => {
    normalizer = new CsvNormalizer();
  });

  function makeRow(data: Record<string, string>, lineNumber = 2): RawImportRow {
    return { lineNumber, data };
  }

  describe('normalize', () => {
    it('should normalize product name', () => {
      const row = normalizer.normalize(
        makeRow({ product_name: '  Product  Name  ' }),
      );

      expect(row.product).toBeDefined();
      expect(row.product!.name).toBe('Product Name');
    });

    it('should normalize SKU to uppercase', () => {
      const row = normalizer.normalize(
        makeRow({ product_name: 'Widget', sku: 'abc-123' }),
      );

      expect(row.product!.sku).toBe('ABC-123');
    });

    it('should normalize slug from name', () => {
      const row = normalizer.normalize(
        makeRow({ brand_name: 'Minha Marca' }),
      );

      expect(row.brand).toBeDefined();
      expect(row.brand!.slug).toBe('minha-marca');
    });

    it('should normalize decimal with comma', () => {
      const row = normalizer.normalize(
        makeRow({ product_name: 'Widget', price: '19,90' }),
      );

      expect(row.price).toBeDefined();
      expect(row.price!.value).toBe(19.9);
    });

    it('should normalize date DD/MM/YYYY', () => {
      const row = normalizer.normalize(
        makeRow({
          product_name: 'Widget',
          price: '10.00',
          valid_from: '01/06/2025',
          valid_to: '31/12/2025',
        }),
      );

      expect(row.price!.validFrom).toEqual(new Date(2025, 5, 1));
      expect(row.price!.validTo).toEqual(new Date(2025, 11, 31));
    });

    it('should handle missing fields', () => {
      const row = normalizer.normalize(makeRow({}));

      expect(row.product).toBeUndefined();
      expect(row.brand).toBeUndefined();
      expect(row.category).toBeUndefined();
      expect(row.store).toBeUndefined();
      expect(row.price).toBeUndefined();
      expect(row.inventory).toBeUndefined();
    });
  });
});
