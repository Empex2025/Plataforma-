import { Readable } from 'node:stream';
import { CsvImportParser } from './csv.parser.js';

describe('CsvImportParser', () => {
  let parser: CsvImportParser;

  beforeEach(() => {
    parser = new CsvImportParser();
  });

  describe('supports', () => {
    it('should return true for csv', () => {
      expect(parser.supports('csv')).toBe(true);
    });

    it('should return false for xml', () => {
      expect(parser.supports('xml')).toBe(false);
    });
  });

  describe('parse', () => {
    function toStream(csv: string): Readable {
      return Readable.from(Buffer.from(csv));
    }

    it('should parse valid CSV', async () => {
      const csv = 'product_name,sku,price\nWidget,ABC-123,19.90\nGadget,XYZ-789,29.90\n';
      const stream = toStream(csv);

      const results: { lineNumber: number; data: Record<string, string> }[] = [];
      for await (const row of parser.parse(stream)) {
        results.push(row);
      }

      expect(results).toHaveLength(2);
      expect(results[0].data.product_name).toBe('Widget');
      expect(results[0].data.sku).toBe('ABC-123');
      expect(results[1].data.product_name).toBe('Gadget');
      expect(results[0].lineNumber).toBe(2);
    });

    it('should handle empty CSV', async () => {
      const csv = 'product_name,sku,price\n';
      const stream = toStream(csv);

      const results: { lineNumber: number; data: Record<string, string> }[] = [];
      for await (const row of parser.parse(stream)) {
        results.push(row);
      }

      expect(results).toHaveLength(0);
    });

    it('should handle CSV with header only', async () => {
      const csv = 'product_name,sku,price\n';
      const stream = toStream(csv);

      const results: { lineNumber: number; data: Record<string, string> }[] = [];
      for await (const row of parser.parse(stream)) {
        results.push(row);
      }

      expect(results).toHaveLength(0);
    });
  });
});
