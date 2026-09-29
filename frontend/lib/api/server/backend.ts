import { API_BASE_URL } from "./config"

export function backendUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${API_BASE_URL}/api${normalized}`
}

export function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(backendUrl(path), { ...init, cache: "no-store" })
}
