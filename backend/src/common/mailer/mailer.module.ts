import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PROVIDER } from './mailer.types.js';
import { ConsoleMailerProvider, HttpMailerProvider } from './mailer.provider.js';

@Global()
@Module({
  providers: [
    ConsoleMailerProvider,
    HttpMailerProvider,
    {
      provide: MAILER_PROVIDER,
      inject: [ConfigService, ConsoleMailerProvider, HttpMailerProvider],
      useFactory: (
        config: ConfigService,
        consoleProvider: ConsoleMailerProvider,
        httpProvider: HttpMailerProvider,
      ) =>
        config.get<string>('MAILER_API_URL') ? httpProvider : consoleProvider,
    },
  ],
  exports: [MAILER_PROVIDER],
})
export class MailerModule {}
