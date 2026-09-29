import { Injectable, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    });

    this.bucket = process.env.S3_BUCKET ?? 'imports';

    const base =
      process.env.S3_PUBLIC_URL ??
      `${process.env.S3_ENDPOINT ?? ''}/${this.bucket}`;
    this.publicBase = base.replace(/\/+$/, '');
  }

  buildKey(prefix: string, originalName: string): string {
    const dot = originalName.lastIndexOf('.');
    const extension = dot >= 0 ? originalName.slice(dot) : '';
    return `${prefix}/${randomUUID()}${extension}`;
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      },
    });

    await upload.done();
    this.logger.log(`File uploaded: ${key}`);
    return `${this.publicBase}/${key}`;
  }
}
