"use client"

export function useAuth() {
  return {
    user: null as { email?: string } | null,
    userName: "",
    userInitials: "",
    avatarUrl: null as string | null,
    logout: () => {},
  }
}
