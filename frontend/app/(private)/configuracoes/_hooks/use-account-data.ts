"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { authApi, companiesApi, storesApi, getErrorMessage } from "@/lib/api"
import type { PersonType } from "@/lib/api"

type AccountForm = {
  fullName: string
  email: string
  document: string
  rg: string
  cnpj: string
  razaoSocial: string
  storeName: string
}

const EMPTY_FORM: AccountForm = {
  fullName: "",
  email: "",
  document: "",
  rg: "",
  cnpj: "",
  razaoSocial: "",
  storeName: "",
}

export const useAccountData = () => {
  const queryClient = useQueryClient()

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    retry: false,
  })

  const { data: memberships } = useQuery({
    queryKey: ["companies"],
    queryFn: () => companiesApi.list(),
    retry: false,
  })

  const company = memberships?.[0]?.company ?? null

  const { data: stores } = useQuery({
    queryKey: ["stores", company?.id],
    queryFn: () => storesApi.list(company!.id),
    enabled: Boolean(company?.id),
    retry: false,
  })

  const primaryStore = stores?.[0] ?? null
  const personType: PersonType | null = user?.personType ?? null

  const [form, setForm] = useState<AccountForm>(EMPTY_FORM)

  useEffect(() => {
    if (!user && !company) return

    setForm({
      fullName: user?.name ?? "",
      email: user?.email ?? "",
      document: user?.document ?? "",
      rg: "",
      cnpj: company?.cnpj ?? "",
      razaoSocial: company?.name ?? "",
      storeName: primaryStore?.name ?? "",
    })
  }, [user, company, primaryStore])

  const update = (field: keyof AccountForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!company) throw new Error("Empresa não encontrada")
      const name = personType === "PF" ? form.fullName : form.razaoSocial
      return companiesApi.update(company.id, { name })
    },

    onSuccess: () => {
      toast.success("Alterações salvas com sucesso")
      queryClient.invalidateQueries({ queryKey: ["companies"] })
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao salvar alterações"))
    },
  })

  const onSave = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  const lastUpdate = company?.updatedAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(company.updatedAt))
    : "—"

  return {
    personType,
    form,
    update,
    onSave,
    isSaving: mutation.isPending,
    lastUpdate,
  }
}
