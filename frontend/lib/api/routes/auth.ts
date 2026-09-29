import { apiFetch } from "../http"
import type {
  AuthResponse,
  CompleteRegistrationRequest,
  ConfirmVerificationRequest,
  ConvertToPjRequest,
  LoginRequest,
  LogoutResponse,
  OnboardingState,
  RegisterRequest,
  RequestVerificationRequest,
  User,
} from "../types"

export const authApi = {
  login: (data: LoginRequest) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: data }),

  register: (data: RegisterRequest) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: data }),

  me: () => apiFetch<User>("/auth/me"),

  onboardingState: () => apiFetch<OnboardingState>("/auth/onboarding-state"),

  logout: () => apiFetch<LogoutResponse>("/auth/logout", { method: "POST" }),

  requestVerification: (data: RequestVerificationRequest) =>
    apiFetch<{ ok: boolean }>("/auth/verification/request", {
      method: "POST",
      body: data,
    }),

  confirmVerification: (data: ConfirmVerificationRequest) =>
    apiFetch<User>("/auth/verification/confirm", {
      method: "POST",
      body: data,
    }),

  completeRegistration: (data: CompleteRegistrationRequest) =>
    apiFetch<User>("/auth/complete", { method: "POST", body: data }),

  convertToPj: (data: ConvertToPjRequest) =>
    apiFetch<User>("/auth/convert-to-pj", { method: "POST", body: data }),
}
