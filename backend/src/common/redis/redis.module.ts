import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service.js';

@Global()
@Module({
  providers: [
    {
      provide: RedisService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new RedisService({
          host: config.get<string>('VALKEY_HOST', 'localhost'),
          port: parseInt(config.get<string>('VALKEY_PORT', '6379'), 10),
          ...(config.get<string>('VALKEY_PASSWORD')
            ? { password: config.get<string>('VALKEY_PASSWORD') }
            : {}),
        }),
    },
  ],
  exports: [RedisService],
})
export class RedisModule {}
