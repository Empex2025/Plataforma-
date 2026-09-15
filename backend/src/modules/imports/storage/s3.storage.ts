import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'node:stream';
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { IImportStorage, MulterFile } from '../imports.types.js';

@Injectable()
export class S3Storage implements IImportStorage {
  private readonly logger = new Logger(S3Storage.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET_KEY ?? '',
      },
      forcePathStyle: true,
    });
    this.bucket = process.env.S3_BUCKET ?? 'imports';
  }

  async upload(file: MulterFile, key: string): Promise<string> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    await upload.done();
    this.logger.log(`File uploaded to S3: ${key}`);
    return key;
  }

  async download(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error(`File not found in S3: ${key}`);
    }

    return response.Body.transformToWebStream() as unknown as Readable;
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`File deleted from S3: ${key}`);
  }
}
