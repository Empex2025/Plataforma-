import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const CONNECT_TIMEOUT_MS = 1500;

@Injectable()
export class ValkeyHealthIndicator {
  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<boolean> {
    const host = this.config.get<string>('VALKEY_HOST', 'localhost');
    const port = parseInt(this.config.get<string>('VALKEY_PORT', '6379'), 10);
    const client = new Redis({
      host,
      port,
      lazyConnect: true,
      connectTimeout: CONNECT_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    try {
      await client.connect();
      await client.ping();
      return true;
    } catch {
      return false;
    } finally {
      client.disconnect();
    }
  }
}
