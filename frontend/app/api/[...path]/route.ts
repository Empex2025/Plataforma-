import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { backendFetch } from "@/lib/api/server/backend"
import { getAccessToken } from "@/lib/api/server/session"

type RouteContext = { params: Promise<{ path: string[] }> }

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  const token = await getAccessToken()

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("connection")
  headers.delete("content-length")
  headers.delete("cookie")
  headers.delete("accept-encoding")
  headers.set("accept", request.headers.get("accept") ?? "application/json")

  if (token) {
    headers.set("authorization", `Bearer ${token}`)
  } else {
    headers.delete("authorization")
  }

  const method = request.method.toUpperCase()
  const hasBody = method !== "GET" && method !== "HEAD"

  const response = await backendFetch(
    `/${path.join("/")}${request.nextUrl.search}`,
    {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    }
  )

  const responseHeaders = new Headers(response.headers)
  responseHeaders.delete("content-encoding")
  responseHeaders.delete("content-length")

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  })
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as HEAD,
}
