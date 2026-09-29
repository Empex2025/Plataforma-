import { NextResponse } from "next/server"

import { backendFetch } from "@/lib/api/server/backend"
import { AUTH_COOKIE, REFRESH_COOKIE } from "@/lib/api/server/config"
import { getRefreshToken } from "@/lib/api/server/session"

export async function POST() {
  const refreshToken = await getRefreshToken()

  if (refreshToken) {
    await backendFetch("/auth/logout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined)
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete(AUTH_COOKIE)
  response.cookies.delete(REFRESH_COOKIE)
  return response
}
