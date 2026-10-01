"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  inventoryApi,
  pricesApi,
  productsApi,
  getErrorMessage,
  type Product,
} from "@/lib/api"
import { usePrimaryCompany } from "@/hooks/use-primary-company"

const PAGE_SIZE = 10

export type ProductListItem = Product & {
  price: number | null
  stock: number
}

export const useProducts = () => {
  const { companyId } = usePrimaryCompany()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")

  const { data, isLoading } = useQuery({
    queryKey: ["products", companyId, page],
    queryFn: () => productsApi.list(companyId!, page, PAGE_SIZE),
    enabled: Boolean(companyId),
    retry: false,
  })

  const { data: prices = [] } = useQuery({
    queryKey: ["prices", companyId],
    queryFn: () => pricesApi.list(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const { data: inventories = [] } = useQuery({
    queryKey: ["inventory", companyId],
    queryFn: () => inventoryApi.list(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const items: ProductListItem[] = (data?.data ?? [])
    .map((product) => {
      const regularPrice = prices.find(
        (price) => price.productId === product.id && price.type === "REGULAR"
      )
      const stock = inventories
        .filter((inventory) => inventory.productId === product.id)
        .reduce((total, inventory) => total + inventory.quantity, 0)

      return { ...product, price: regularPrice?.value ?? null, stock }
    })
    .filter((product) => {
      const term = search.trim().toLowerCase()
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.sku ?? "").toLowerCase().includes(term)
      const matchesStatus = status === "all" || product.status === status
      return matchesSearch && matchesStatus
    })

  const deactivate = useMutation({
    mutationFn: (productId: string) =>
      productsApi.deactivate(companyId!, productId),

    onSuccess: () => {
      toast.success("Produto desativado")
      queryClient.invalidateQueries({ queryKey: ["products"] })
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao desativar produto"))
    },
  })

  return {
    items,
    isLoading,
    page,
    setPage,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    search,
    setSearch,
    status,
    setStatus,
    onDeactivate: (productId: string) => deactivate.mutate(productId),
  }
}
