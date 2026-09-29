import { Inject, Injectable } from '@nestjs/common';
import {
  MAILER_PROVIDER,
  type IMailerProvider,
} from '@/common/mailer/mailer.types.js';

@Injectable()
export class MailerService {
  constructor(
    @Inject(MAILER_PROVIDER) private readonly provider: IMailerProvider,
  ) {}

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    await this.provider.send({
      to: email,
      subject: 'Recuperação de senha',
      body: `Seu código de recuperação é ${otp}. Ele expira em alguns minutos.`,
    });
  }

  async sendVerificationOtp(email: string, otp: string): Promise<void> {
    await this.provider.send({
      to: email,
      subject: 'Verificação de e-mail',
      body: `Seu código de verificação é ${otp}.`,
    });
  }

  async sendVerificationSms(phone: string, otp: string): Promise<void> {
    await this.provider.send({
      to: phone,
      subject: 'Verificação de telefone',
      body: `Seu código de verificação é ${otp}.`,
    });
  }
}
