"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { brandsApi, getErrorMessage } from "@/lib/api"
import { usePrimaryCompany } from "@/hooks/use-primary-company"

export const useBrands = () => {
  const { companyId } = usePrimaryCompany()
  const queryClient = useQueryClient()

  const { data = [], isLoading } = useQuery({
    queryKey: ["brands", companyId],
    queryFn: () => brandsApi.list(companyId!),
    enabled: Boolean(companyId),
    retry: false,
  })

  const remove = useMutation({
    mutationFn: (brandId: string) => brandsApi.remove(companyId!, brandId),

    onSuccess: () => {
      toast.success("Marca removida")
      queryClient.invalidateQueries({ queryKey: ["brands"] })
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao remover marca"))
    },
  })

  return {
    brands: data,
    companyId,
    isLoading,
    onRemove: (brandId: string) => remove.mutate(brandId),
  }
}
