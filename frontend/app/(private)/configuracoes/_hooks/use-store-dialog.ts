"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { storesApi, uploadsApi, getErrorMessage, type Store } from "@/lib/api"
import { onlyDigits } from "@/lib/utils"

type StoreForm = {
  name: string
  zipCode: string
  address: string
  complement: string
  cityState: string
  phone: string
  whatsapp: string
  instagram: string
}

const EMPTY_FORM: StoreForm = {
  name: "",
  zipCode: "",
  address: "",
  complement: "",
  cityState: "",
  phone: "",
  whatsapp: "",
  instagram: "",
}

function splitCityState(value: string): { city?: string; state?: string } {
  const [city, state] = value.split(/\s*[-,/]\s*/)
  return { city: city?.trim() || undefined, state: state?.trim() || undefined }
}

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocalização não é suportada neste dispositivo"))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () =>
        reject(
          new Error(
            "Não foi possível obter sua localização. Permita o acesso e tente novamente."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

export const useStoreDialog = (
  store: Store | undefined,
  companyId: string | null
) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM)

  const isEditing = Boolean(store)

  useEffect(() => {
    if (!open) return

    setForm({
      name: store?.name ?? "",
      zipCode: store?.zipCode ?? "",
      address: store?.address ?? "",
      complement: store?.complement ?? "",
      cityState: store?.city
        ? `${store.city}${store.state ? ` - ${store.state}` : ""}`
        : "",
      phone: store?.phone ?? "",
      whatsapp: store?.whatsapp ?? "",
      instagram: store?.instagram ?? "",
    })
    setLogoFile(null)
    setCoverFile(null)
  }, [open, store])

  const update = (field: keyof StoreForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não encontrada")

      const [logoUrl, coverUrl] = await Promise.all([
        logoFile
          ? uploadsApi.image(logoFile).then((response) => response.url)
          : Promise.resolve(undefined),
        coverFile
          ? uploadsApi.image(coverFile).then((response) => response.url)
          : Promise.resolve(undefined),
      ])

      const { city, state } = splitCityState(form.cityState)

      if (store) {
        return storesApi.update(
          store.id,
          {
            name: form.name || undefined,
            zipCode: onlyDigits(form.zipCode) || undefined,
            address: form.address || undefined,
            complement: form.complement || undefined,
            city,
            state,
            phone: onlyDigits(form.phone) || undefined,
            whatsapp: onlyDigits(form.whatsapp) || undefined,
            instagram: form.instagram || undefined,
            logoUrl,
            coverUrl,
          },
          companyId
        )
      }

      if (!form.name) throw new Error("Informe o nome da loja")

      const { lat, lng } = await getCurrentPosition()
      return storesApi.create(companyId, {
        name: form.name,
        zipCode: onlyDigits(form.zipCode) || undefined,
        address: form.address || undefined,
        complement: form.complement || undefined,
        city,
        state,
        phone: onlyDigits(form.phone) || undefined,
        whatsapp: onlyDigits(form.whatsapp) || undefined,
        lat,
        lng,
      })
    },

    onSuccess: () => {
      toast.success(isEditing ? "Loja atualizada" : "Loja criada")
      queryClient.invalidateQueries({ queryKey: ["stores"] })
      setOpen(false)
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao salvar loja"))
    },
  })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return {
    open,
    setOpen,
    form,
    update,
    onSubmit,
    setLogoFile,
    setCoverFile,
    isSaving: mutation.isPending,
    isEditing,
    logoUrl: store?.logoUrl ?? null,
    coverUrl: store?.coverUrl ?? null,
  }
}
