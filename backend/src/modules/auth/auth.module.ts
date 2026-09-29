import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RefreshTokenService } from './services/refresh-token.service.js';
import { LoginAttemptService } from './services/login-attempt.service.js';
import { PasswordResetService } from './services/password-reset.service.js';
import { VerificationService } from './services/verification.service.js';
import { MailerService } from './services/mailer.service.js';
import { UsersModule } from '@/modules/users/users.module.js';
import { DEFAULT_ACCESS_EXPIRATION } from './auth.constants.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_ACCESS_EXPIRATION',
            DEFAULT_ACCESS_EXPIRATION,
          ) as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenService,
    LoginAttemptService,
    PasswordResetService,
    VerificationService,
    MailerService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
