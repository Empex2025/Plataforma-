export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MERCHANT_OWNER"
  | "MERCHANT_MANAGER"
  | "CONSUMER"

export type PersonType = "PF" | "PJ"

export type VerificationChannel = "email" | "phone"

export type OnboardingStep =
  | "verify-email"
  | "verify-phone"
  | "complete"
  | "pending-approval"
  | "store-setup"
  | "done"

export type OnboardingState = {
  step: OnboardingStep
  emailVerified: boolean
  phoneVerified: boolean
  profileCompleted: boolean
  companyStatus: string | null
  personType: PersonType | null
  hasStore: boolean
}

export type User = {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  active: boolean
  emailVerifiedAt: string | null
  phoneVerifiedAt: string | null
  profileCompletedAt: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  personType: PersonType
  document: string
  email: string
  phone?: string
  password: string
}

export type RequestVerificationRequest = {
  channel: VerificationChannel
}

export type ConfirmVerificationRequest = {
  channel: VerificationChannel
  code: string
}

export type CompleteRegistrationRequest = {
  type: PersonType
  fullName?: string
  corporateName?: string
  tradeName?: string
  cnae?: string
  fullAddress?: string
  repFullName?: string
}

export type ConvertToPjRequest = {
  cnpj: string
  corporateName: string
  tradeName?: string
}

export type AuthResponse = {
  user: User
}

export type LogoutResponse = {
  ok: boolean
}
