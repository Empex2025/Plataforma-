import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/api/server/backend"
import { AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/api/server/config"
import {
  authCookieOptions,
  getRefreshToken,
  refreshCookieOptions,
} from "@/lib/api/server/session"

type BackendAuthResponse = {
  user: unknown
  token: string
  refreshToken: string
}

export async function POST() {
  const refreshToken = await getRefreshToken()

  if (!refreshToken) {
    const unauthorized = NextResponse.json(
      { message: "Sessão expirada" },
      { status: 401 }
    )
    unauthorized.cookies.delete(AUTH_COOKIE)
    unauthorized.cookies.delete(REFRESH_COOKIE)
    return unauthorized
  }

  const response = await backendFetch("/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) {
    const failed = NextResponse.json(
      { message: "Sessão expirada" },
      { status: 401 }
    )
    failed.cookies.delete(AUTH_COOKIE)
    failed.cookies.delete(REFRESH_COOKIE)
    return failed
  }

  const { user, token, refreshToken: rotated } =
    (await response.json()) as BackendAuthResponse

  const next = NextResponse.json({ user })
  next.cookies.set(AUTH_COOKIE, token, authCookieOptions())
  next.cookies.set(REFRESH_COOKIE, rotated, refreshCookieOptions())
  return next
}
