export const MAILER_PROVIDER = 'MAILER_PROVIDER';

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface IMailerProvider {
  send(message: MailMessage): Promise<void>;
}
