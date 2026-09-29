import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { storesApi, getErrorMessage } from "@/lib/api"
import { onlyDigits } from "@/lib/utils"

import {
  storeSetupSchema,
  type StoreSetupFormData,
} from "../_schemas/store-setup.schema"

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

export const useStoreSetup = () => {
  const router = useRouter()

  const storeSetupForm = useForm<StoreSetupFormData>({
    resolver: zodResolver(storeSetupSchema),
    defaultValues: {
      name: "",
      zipCode: "",
      address: "",
      complement: "",
      cityState: "",
      logo: null,
      cover: null,
      schedules: [
        { days: ["Seg", "Ter", "Qua", "Qui", "Sex"], start: "09:00", end: "18:00" },
        { days: ["Sáb", "Dom"], start: "08:00", end: "12:00" },
      ],
      phone: "",
      whatsapp: "",
      instagram: "",
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: StoreSetupFormData) => {
      const { lat, lng } = await getCurrentPosition()

      return storesApi.onboarding({
        name: data.name,
        zipCode: onlyDigits(data.zipCode),
        address: data.address,
        complement: data.complement,
        cityState: data.cityState,
        phone: onlyDigits(data.phone),
        whatsapp: onlyDigits(data.whatsapp),
        instagram: data.instagram || undefined,
        logoUrl: data.logo ?? undefined,
        coverUrl: data.cover ?? undefined,
        hours: data.schedules
          .filter((schedule) => schedule.start && schedule.end)
          .map((schedule) => ({
            days: schedule.days,
            start: schedule.start,
            end: schedule.end,
          })),
        lat,
        lng,
      })
    },

    onSuccess: () => {
      toast.success("Loja configurada com sucesso")
      router.push("/")
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao configurar loja"))
    },
  })

  const onStoreSetup = (data: StoreSetupFormData) => {
    mutation.mutate(data)
  }

  return {
    storeSetupForm,
    onStoreSetup,
    isLoading: mutation.isPending,
  }
}
