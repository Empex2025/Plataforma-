"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { brandsApi, uploadsApi, getErrorMessage, type Brand } from "@/lib/api"

export const useBrandDialog = (companyId: string | null, brand?: Brand) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const isEditing = Boolean(brand)

  useEffect(() => {
    if (!open) return
    setName(brand?.name ?? "")
    setLogoFile(null)
    setPreview(null)
  }, [open, brand])

  function selectLogo(file: File | null) {
    if (file && !file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas")
      return
    }
    setLogoFile(file)
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return file ? URL.createObjectURL(file) : null
    })
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada")

      const logoUrl = logoFile
        ? (await uploadsApi.image(logoFile)).url
        : (brand?.logoUrl ?? undefined)

      if (brand) {
        return brandsApi.update(companyId, brand.id, { name, logoUrl })
      }

      return brandsApi.create(companyId, { name, logoUrl })
    },

    onSuccess: () => {
      toast.success(isEditing ? "Marca atualizada" : "Marca criada")
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      setOpen(false)
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao salvar marca"))
    },
  })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return {
    open,
    setOpen,
    name,
    setName,
    selectLogo,
    logoPreview: preview ?? brand?.logoUrl ?? null,
    onSubmit,
    isSaving: mutation.isPending,
    isEditing,
  }
}
