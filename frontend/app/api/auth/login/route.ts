import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/api/server/backend"
import { AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/api/server/config"
import {
  authCookieOptions,
  refreshCookieOptions,
} from "@/lib/api/server/session"

type BackendAuthResponse = {
  user: unknown
  token: string
  refreshToken: string
}

export async function POST(request: Request) {
  const body = await request.text()

  const response = await backendFetch("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  })

  const data = (await response.json().catch(() => null)) as
    | BackendAuthResponse
    | { message?: string }
    | null

  if (!response.ok) {
    return NextResponse.json(data ?? { message: "Não foi possível entrar" }, {
      status: response.status,
    })
  }

  const { user, token, refreshToken } = data as BackendAuthResponse

  const next = NextResponse.json({ user })
  next.cookies.set(AUTH_COOKIE, token, authCookieOptions())
  next.cookies.set(REFRESH_COOKIE, refreshToken, refreshCookieOptions())
  return next
}
