"use client"

import { useQuery } from "@tanstack/react-query"

import { companiesApi, storesApi } from "@/lib/api"

export const useManageStores = () => {
  const { data: memberships } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list(),
    retry: false,
  })

  const company = memberships?.[0]?.company ?? null

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores", company?.id],
    queryFn: () => storesApi.list(company!.id),
    enabled: Boolean(company?.id),
    retry: false,
  })

  return { stores, companyId: company?.id ?? null, isLoading }
}
