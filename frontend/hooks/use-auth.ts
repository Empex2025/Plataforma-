"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { authApi } from "@/lib/api"

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    retry: false,
  })

  const userName =
    user?.name ?? user?.email.split("@")[0] ?? "Usuário"

  const logout = async () => {
    await authApi.logout().catch(() => undefined)
    queryClient.clear()
    router.push("/auth/login")
    router.refresh()
  }

  return {
    user,
    userName,
    avatarUrl: user?.avatarUrl ?? null,
    isLoading,
    logout,
  }
}
