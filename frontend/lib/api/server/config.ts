export const API_BASE_URL = process.env.API_URL ?? "http://localhost:3000"

export const AUTH_COOKIE = "access_token"
export const REFRESH_COOKIE = "refresh_token"

export const AUTH_COOKIE_MAX_AGE = 15 * 60
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60
