"use client"

export function useAuth() {
  // TODO: Implementar better-auth
  const user = {
    name: "Maria Oliveira",
    email: "maria.oliveira@lojadaesquina.com.br",
  }

  return {
    user,
    userName: user.name,
    avatarUrl: null as string | null,
    logout: () => {},
  }
}
