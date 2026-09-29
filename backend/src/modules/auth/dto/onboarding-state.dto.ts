import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type OnboardingStep =
  | 'verify-email'
  | 'verify-phone'
  | 'complete'
  | 'pending-approval'
  | 'store-setup'
  | 'done';

export class OnboardingStateDto {
  @ApiProperty({
    description: 'Próxima etapa obrigatória do onboarding',
    enum: [
      'verify-email',
      'verify-phone',
      'complete',
      'pending-approval',
      'store-setup',
      'done',
    ],
  })
  step!: OnboardingStep;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty()
  phoneVerified!: boolean;

  @ApiProperty()
  profileCompleted!: boolean;

  @ApiPropertyOptional({ nullable: true })
  companyStatus?: string | null;

  @ApiPropertyOptional({ nullable: true, enum: ['PF', 'PJ'] })
  personType?: string | null;

  @ApiProperty()
  hasStore!: boolean;
}
