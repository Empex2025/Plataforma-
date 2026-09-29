import { ApiError } from "./api-error"
import type { ApiErrorBody } from "./types"

const API_PREFIX = "/api"

const NO_RETRY_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
])

function extractMessage(body: ApiErrorBody | null, fallback: string): string {
  if (!body) return fallback
  if (Array.isArray(body.message)) return body.message[0] ?? fallback
  return body.message ?? fallback
}

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown }

async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${API_PREFIX}/auth/refresh`, {
      method: "POST",
      credentials: "same-origin",
    })
    return response.ok
  } catch {
    return false
  }
}

function toApiError(response: Response, data: ApiErrorBody | null): ApiError {
  return new ApiError(
    response.status,
    extractMessage(data, "Erro inesperado"),
    data ?? undefined
  )
}

async function execute<T>(
  path: string,
  options: ApiRequestOptions,
  allowRefresh: boolean
): Promise<T> {
  const { body, headers, ...init } = options
  const hasBody = body !== undefined

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(hasBody ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  })

  if (response.status === 401 && allowRefresh && !NO_RETRY_PATHS.has(path)) {
    const renewed = await refreshSession()
    if (renewed) return execute<T>(path, options, false)
  }

  const data: ApiErrorBody | T | null = await response.json().catch(() => null)

  if (!response.ok) {
    throw toApiError(response, data as ApiErrorBody | null)
  }

  return data as T
}

export function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return execute<T>(path, options, true)
}

export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const send = () =>
    fetch(`${API_PREFIX}${path}`, {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    })

  let response = await send()

  if (response.status === 401) {
    const renewed = await refreshSession()
    if (renewed) response = await send()
  }

  const data: ApiErrorBody | T | null = await response.json().catch(() => null)

  if (!response.ok) {
    throw toApiError(response, data as ApiErrorBody | null)
  }

  return data as T
}
