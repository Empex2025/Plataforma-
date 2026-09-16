import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { completeSchema, CompleteFormData } from "../_schemas/complete.schema"
import type { PersonType } from "../../_schemas/register.schema"

export const useCompleteForm = (type: PersonType) => {
  const router = useRouter()

  const completeForm = useForm<CompleteFormData>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      type,
      step: 1,
      fullName: "",
      birthDate: "",
      zipCode: "",
      address: "",
      neighborhood: "",
      city: "",
      corporateName: "",
      tradeName: "",
      cnae: "",
      fullAddress: "",
      repFullName: "",
      repCpf: "",
      repBirthDate: "",
      repPhone: "",
      repAddress: "",
      repRole: "",
      repRelationship: "",
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CompleteFormData) => {
      // TODO: Implementar better-auth
      console.log("Complete registration data:", data)
      return data
    },

    onSuccess: () => {
      toast.success("Cadastro finalizado com sucesso")
      router.push("/auth/loja")
    },

    onError: (err: Error) => {
      toast.error(err.message || "Erro ao finalizar cadastro")
    },
  })

  const onComplete = (data: CompleteFormData) => {
    mutation.mutate(data)
  }

  return {
    completeForm,
    onComplete,
    isLoading: mutation.isPending,
  }
}
