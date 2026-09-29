"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { authApi, getErrorMessage } from "@/lib/api"

export const useConvertToPj = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [cnpj, setCnpj] = useState("")
  const [corporateName, setCorporateName] = useState("")
  const [tradeName, setTradeName] = useState("")

  const mutation = useMutation({
    mutationFn: () => authApi.convertToPj({ cnpj, corporateName, tradeName }),

    onSuccess: () => {
      toast.success("Conta convertida para Pessoa Jurídica")
      queryClient.clear()
      setOpen(false)
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao converter para PJ"))
    },
  })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return {
    open,
    setOpen,
    cnpj,
    setCnpj,
    corporateName,
    setCorporateName,
    tradeName,
    setTradeName,
    onSubmit,
    isSubmitting: mutation.isPending,
  }
}
