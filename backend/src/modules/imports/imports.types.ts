import { Readable } from 'node:stream';
import { ProductStatus, PriceType } from '@/generated/prisma/enums.js';

export const IMPORT_STORAGE = 'IImportStorage';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

export interface IImportParser {
  supports(format: string): boolean;
  parse(stream: Readable): AsyncGenerator<RawImportRow, void, undefined>;
}

export interface IImportStorage {
  upload(file: MulterFile, key: string): Promise<string>;
  download(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}

export interface RawImportRow {
  lineNumber: number;
  data: Record<string, string>;
}

export interface NormalizedImportRow {
  lineNumber: number;
  product?: {
    name?: string;
    sku?: string;
    barcode?: string;
    description?: string;
    status?: ProductStatus;
  };
  brand?: {
    name?: string;
    slug?: string;
  };
  category?: {
    slug?: string;
  };
  store?: {
    slug?: string;
  };
  price?: {
    value?: number;
    type?: PriceType;
    validFrom?: Date;
    validTo?: Date;
  };
  inventory?: {
    quantity?: number;
  };
}

export interface ImportError {
  line: number;
  field?: string;
  code: string;
  message: string;
  value?: string;
}

export interface ImportJobData {
  importJobId: string;
  companyId: string;
  fileKey: string;
  format: string;
}
