import { NextResponse, type NextRequest } from "next/server"

import {
  API_BASE_URL,
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
} from "@/lib/api/server/config"

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/produtos",
  "/configuracoes",
  "/marketing",
  "/avaliacoes",
  "/mensagens",
  "/notificacoes",
]

const GUEST_ONLY_ROUTES = new Set(["/auth/login", "/auth/register"])

const STEP_PATH: Record<string, string> = {
  "verify-email": "/auth/verify",
  "verify-phone": "/auth/verify",
  complete: "/auth/register/complete",
  "pending-approval": "/auth/loja",
  "store-setup": "/auth/loja",
  done: "/dashboard",
}

interface OnboardingState {
  step: string
  personType: "PF" | "PJ" | null
}

interface TokenPair {
  token: string
  refreshToken: string
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}

function applyTokens(
  response: NextResponse,
  tokens: TokenPair | null
): NextResponse {
  if (!tokens) return response

  response.cookies.set(
    AUTH_COOKIE,
    tokens.token,
    cookieOptions(AUTH_COOKIE_MAX_AGE)
  )
  response.cookies.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(REFRESH_COOKIE_MAX_AGE)
  )
  return response
}

async function fetchOnboardingState(
  accessToken: string
): Promise<OnboardingState | "unauthorized" | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/onboarding-state`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (response.status === 401) return "unauthorized"
    if (!response.ok) return null

    return (await response.json()) as OnboardingState
  } catch {
    return null
  }
}

async function refreshTokens(refreshToken: string): Promise<TokenPair | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })

    if (!response.ok) return null

    const data = (await response.json()) as TokenPair
    return { token: data.token, refreshToken: data.refreshToken }
  } catch {
    return null
  }
}

function redirectToStep(
  request: NextRequest,
  state: OnboardingState,
  tokens: TokenPair | null
): NextResponse {
  const path = STEP_PATH[state.step] ?? "/dashboard"
  const url = new URL(path, request.url)

  if (state.step === "complete") {
    url.searchParams.set("type", state.personType === "PJ" ? "PJ" : "PF")
  }

  return applyTokens(NextResponse.redirect(url), tokens)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get(AUTH_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  const authenticated = Boolean(accessToken || refreshToken)

  if (GUEST_ONLY_ROUTES.has(pathname) && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!isProtected(pathname)) {
    return NextResponse.next()
  }

  if (!authenticated) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  let tokens: TokenPair | null = null
  let state = accessToken
    ? await fetchOnboardingState(accessToken)
    : ("unauthorized" as const)

  if (state === "unauthorized" && refreshToken) {
    tokens = await refreshTokens(refreshToken)
    if (tokens) state = await fetchOnboardingState(tokens.token)
  }

  if (state === "unauthorized") {
    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    response.cookies.delete(AUTH_COOKIE)
    response.cookies.delete(REFRESH_COOKIE)
    return response
  }

  if (state === null || state.step === "done") {
    return applyTokens(NextResponse.next(), tokens)
  }

  return redirectToStep(request, state, tokens)
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
