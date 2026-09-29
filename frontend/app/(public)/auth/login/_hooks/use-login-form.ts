import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { authApi, getErrorMessage } from "@/lib/api"

import { loginSchema, type LoginFormData } from "../_schemas/login.schema"

export const useLoginForm = () => {
  const router = useRouter()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),

    onSuccess: () => {
      toast.success("Login realizado com sucesso")
      router.push("/dashboard")
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Erro ao realizar login"))
    },
  })

  const onLogin = (data: LoginFormData) => {
    mutation.mutate(data)
  }

  return {
    loginForm,
    onLogin,
    isLoading: mutation.isPending,
  }
}
