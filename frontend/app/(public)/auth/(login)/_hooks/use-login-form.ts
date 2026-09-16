import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { loginSchema, LoginFormData } from "../_schemas/login.schema"

export const useLoginForm = () => {
  const router = useRouter()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { document: "", password: "" },
  })

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      // TODO: Implementar better-auth
      console.log("Login data:", data)
      return data
    },

    onSuccess: () => {
      toast.success("Login realizado com sucesso")
      router.push("/")
    },

    onError: (err: Error) => {
      toast.error(err.message || "Erro ao realizar login")
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
