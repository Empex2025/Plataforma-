"use client"

import { useQuery } from "@tanstack/react-query"

import { authApi, companiesApi } from "@/lib/api"

export const usePrimaryCompany = () => {
  const { data: memberships } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list(),
    retry: false,
  })

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    retry: false,
  })

  const company = memberships?.[0]?.company ?? null

  return {
    companyId: company?.id ?? null,
    company,
    userRole: user?.role ?? null,
  }
}
