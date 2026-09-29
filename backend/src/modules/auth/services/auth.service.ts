import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '@/db/prisma.service.js';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto.js';
import { onlyDigits, isValidCnpj } from '@/common/validators/document.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { CompleteRegistrationDto } from '../dto/complete-registration.dto.js';
import { ConvertToPjDto } from '../dto/convert-to-pj.dto.js';
import {
  OnboardingStateDto,
  type OnboardingStep,
} from '../dto/onboarding-state.dto.js';
import { DUMMY_PASSWORD_HASH, SALT_ROUNDS } from '../auth.constants.js';
import { LoginAttemptService } from './login-attempt.service.js';
import { MailerService } from './mailer.service.js';
import { PasswordResetService } from './password-reset.service.js';
import { RefreshTokenService } from './refresh-token.service.js';
import {
  VerificationService,
  type VerificationChannel,
} from './verification.service.js';

export interface AuthResponse {
  user: UserResponseDto;
  token: string;
  refreshToken: string;
}

interface TokenPair {
  token: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly loginAttempts: LoginAttemptService,
    private readonly passwordReset: PasswordResetService,
    private readonly verification: VerificationService,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const document = onlyDigits(dto.document);
    const documentTaken = await this.prisma.user.findFirst({
      where: { document },
    });
    if (documentTaken) {
      throw new ConflictException('CPF/CNPJ já cadastrado');
    }

    const passwordHash = await hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name ?? null,
        passwordHash,
        phone: dto.phone ?? null,
        personType: dto.personType,
        document,
        role: 'MERCHANT_OWNER',
      },
    });

    await this.requestVerification(user.id, 'email');

    const tokens = await this.issueTokens(user.id, user.email);

    return {
      user: UserResponseDto.fromPlain(user),
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase();

    if (await this.loginAttempts.isLocked(email)) {
      throw new UnauthorizedException(
        'Conta temporariamente bloqueada. Tente novamente mais tarde.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      await compare(dto.password, DUMMY_PASSWORD_HASH);
      await this.loginAttempts.registerFailure(email);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.active) {
      throw new GoneException('Conta desativada');
    }

    const passwordValid = await compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      await this.loginAttempts.registerFailure(email);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.loginAttempts.reset(email);

    const tokens = await this.issueTokens(user.id, user.email);

    return {
      user: UserResponseDto.fromPlain(user),
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const rotated = await this.refreshTokens.rotate(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: rotated.userId },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Sessão inválida');
    }

    return {
      user: UserResponseDto.fromPlain(user),
      token: this.signAccessToken(user.id, user.email),
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokens.revoke(refreshToken);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) return;

    await this.passwordReset.request(user.email);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const email = dto.email.toLowerCase();

    const valid = await this.passwordReset.consume(email, dto.otp);
    if (!valid) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const passwordHash = await hash(dto.password, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await this.loginAttempts.reset(email);
  }

  async requestVerification(
    userId: string,
    channel: VerificationChannel,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const code = await this.verification.request(userId, channel);

    if (channel === 'email') {
      await this.mailer.sendVerificationOtp(user.email, code);
      return;
    }

    if (user.phone) {
      await this.mailer.sendVerificationSms(user.phone, code);
    }
  }

  async confirmVerification(
    userId: string,
    channel: VerificationChannel,
    code: string,
  ): Promise<UserResponseDto> {
    const valid = await this.verification.consume(userId, channel, code);
    if (!valid) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    const data =
      channel === 'email'
        ? { emailVerifiedAt: new Date() }
        : { phoneVerifiedAt: new Date() };

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return UserResponseDto.fromPlain(user);
  }

  async completeRegistration(
    userId: string,
    dto: CompleteRegistrationDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const name =
      dto.type === 'PJ'
        ? (dto.repFullName ?? dto.corporateName ?? user.name)
        : (dto.fullName ?? user.name);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name, profileCompletedAt: new Date() },
    });

    const linked = await this.prisma.userCompany.findFirst({
      where: { userId },
    });

    if (!linked) {
      const companyName =
        dto.type === 'PJ'
          ? (dto.corporateName ?? dto.tradeName ?? name ?? 'Minha Empresa')
          : (name ?? 'Minha Empresa');

      const company = await this.prisma.company.create({
        data: {
          name: companyName,
          slug: await this.uniqueCompanySlug(companyName),
          cnpj: dto.type === 'PJ' ? (user.document ?? null) : null,
          status: 'PENDING',
        },
      });

      await this.prisma.userCompany.create({
        data: { userId, companyId: company.id, role: 'MERCHANT_OWNER' },
      });
    }

    return UserResponseDto.fromPlain(updated);
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return UserResponseDto.fromPlain(user);
  }

  async getOnboardingState(userId: string): Promise<OnboardingStateDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const membership = await this.prisma.userCompany.findFirst({
      where: { userId },
      include: {
        company: {
          include: { stores: { select: { id: true }, take: 1 } },
        },
      },
    });

    const companyStatus = membership?.company.status ?? null;
    const hasStore = (membership?.company.stores?.length ?? 0) > 0;

    let step: OnboardingStep;
    if (!user.emailVerifiedAt) {
      step = 'verify-email';
    } else if (!user.phoneVerifiedAt) {
      step = 'verify-phone';
    } else if (!user.profileCompletedAt) {
      step = 'complete';
    } else if (companyStatus === 'PENDING') {
      step = 'pending-approval';
    } else if (!hasStore) {
      step = 'store-setup';
    } else {
      step = 'done';
    }

    return {
      step,
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt),
      profileCompleted: Boolean(user.profileCompletedAt),
      companyStatus,
      personType: user.personType,
      hasStore,
    };
  }

  async convertToPj(
    userId: string,
    dto: ConvertToPjDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (user.personType === 'PJ') {
      throw new ConflictException('A conta já é Pessoa Jurídica');
    }

    const cnpj = onlyDigits(dto.cnpj);
    if (!isValidCnpj(cnpj)) {
      throw new BadRequestException('CNPJ inválido');
    }

    const companyWithCnpj = await this.prisma.company.findUnique({
      where: { cnpj },
    });
    if (companyWithCnpj) {
      throw new ConflictException('CNPJ já cadastrado');
    }

    const documentTaken = await this.prisma.user.findFirst({
      where: { document: cnpj, NOT: { id: userId } },
    });
    if (documentTaken) {
      throw new ConflictException('CNPJ já cadastrado');
    }

    const slug = await this.uniqueCompanySlug(
      dto.tradeName ?? dto.corporateName,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.corporateName, slug, cnpj, status: 'PENDING' },
      });

      await tx.userCompany.create({
        data: { userId, companyId: company.id, role: 'MERCHANT_OWNER' },
      });

      return tx.user.update({
        where: { id: userId },
        data: { personType: 'PJ', document: cnpj },
      });
    });

    return UserResponseDto.fromPlain(updated);
  }

  private async issueTokens(userId: string, email: string): Promise<TokenPair> {
    const token = this.signAccessToken(userId, email);
    const refreshToken = await this.refreshTokens.issue(userId, email);
    return { token, refreshToken };
  }

  private signAccessToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email, type: 'access' });
  }

  private async uniqueCompanySlug(base: string): Promise<string> {
    const root =
      base
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'empresa';

    let candidate = root;
    let suffix = 1;

    while (await this.prisma.company.findUnique({ where: { slug: candidate } })) {
      candidate = `${root}-${suffix++}`;
    }

    return candidate;
  }
}
