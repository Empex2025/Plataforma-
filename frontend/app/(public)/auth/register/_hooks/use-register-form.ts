import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { authApi, getErrorMessage } from "@/lib/api"
import { onlyDigits } from "@/lib/utils"

import { registerSchema, type RegisterFormData } from "../_schemas/register.schema"

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
    mutationFn: (data: RegisterFormData) =>
      authApi.register({
        personType: data.personType,
        document: onlyDigits(data.document),
        email: data.email,
        phone: onlyDigits(data.phone),
        password: data.password,
      }),

    onSuccess: (_response, variables) => {
      toast.success("Cadastro realizado com sucesso")
      router.push(`/auth/verify?type=${variables.personType}`)
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao realizar cadastro"))
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
