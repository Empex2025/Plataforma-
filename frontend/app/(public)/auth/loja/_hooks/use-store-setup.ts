import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import {
  storeSetupSchema,
  type StoreSetupFormData,
} from "../_schemas/store-setup.schema"

export const useStoreSetup = () => {
  const router = useRouter()

  const storeSetupForm = useForm<StoreSetupFormData>({
    resolver: zodResolver(storeSetupSchema),
    defaultValues: {
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
      // TODO: Implementar better-auth
      console.log("Store setup data:", data)
      return data
    },

    onSuccess: () => {
      toast.success("Loja configurada com sucesso")
      router.push("/")
    },

    onError: (err: Error) => {
      toast.error(err.message || "Erro ao configurar loja")
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
