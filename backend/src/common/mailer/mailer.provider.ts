import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IMailerProvider, MailMessage } from './mailer.types.js';

@Injectable()
export class ConsoleMailerProvider implements IMailerProvider {
  private readonly logger = new Logger(ConsoleMailerProvider.name);

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[mail] to=${message.to} subject="${message.subject}" body="${message.body}"`,
    );
  }
}

@Injectable()
export class HttpMailerProvider implements IMailerProvider {
  private readonly logger = new Logger(HttpMailerProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(message: MailMessage): Promise<void> {
    const url = this.config.get<string>('MAILER_API_URL');
    if (!url) {
      this.logger.warn('MAILER_API_URL is not configured; email was not sent');
      return;
    }

    const apiKey = this.config.get<string>('MAILER_API_KEY');
    const from = this.config.get<string>(
      'MAILER_FROM',
      'no-reply@encontrae.local',
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          from,
          to: message.to,
          subject: message.subject,
          text: message.body,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(`Mail provider responded with status ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to send email: ${(error as Error).message}`);
    }
  }
}
