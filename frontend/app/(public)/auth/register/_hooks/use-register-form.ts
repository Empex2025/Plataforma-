import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { registerSchema, RegisterFormData } from "../_schemas/register.schema"

export const useRegisterForm = () => {
  const router = useRouter()

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      personType: "PF",
      document: "",
      email: "",
      phone: "",
      password: "",
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      // TODO: Implementar better-auth
      console.log("Register data:", data)
      return data
    },

    onSuccess: (data) => {
      toast.success("Cadastro realizado com sucesso")
      router.push(`/auth/verify?type=${data.personType}`)
    },

    onError: (err: Error) => {
      toast.error(err.message || "Erro ao realizar cadastro")
    },
  })

  const onRegister = (data: RegisterFormData) => {
    mutation.mutate(data)
  }

  return {
    registerForm,
    onRegister,
    isLoading: mutation.isPending,
  }
}
