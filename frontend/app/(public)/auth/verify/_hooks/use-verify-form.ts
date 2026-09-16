import { useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { verifyCodeSchema, VerifyCodeFormData } from "../_schemas/verify.schema"

export const useVerifyCodeForm = () => {
  const verifyForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: "" },
  })

  const mutation = useMutation({
    mutationFn: async (data: VerifyCodeFormData) => {
      // TODO: Implementar better-auth
      console.log("Verify code data:", data)
      return data
    },

    onError: (err: Error) => {
      toast.error(err.message || "Código de verificação inválido")
    },
  })

  const onVerify = (data: VerifyCodeFormData) => {
    mutation.mutate(data)
  }

  const { reset: resetForm } = verifyForm
  const { reset: resetMutation } = mutation

  const reset = useCallback(() => {
    resetForm()
    resetMutation()
  }, [resetForm, resetMutation])

  return {
    verifyForm,
    onVerify,
    reset,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
  }
}
