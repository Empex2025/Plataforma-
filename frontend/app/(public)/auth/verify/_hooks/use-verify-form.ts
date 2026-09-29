import { useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { authApi, getErrorMessage } from "@/lib/api"

import {
  verifyCodeSchema,
  type VerifyChannel,
  type VerifyCodeFormData,
} from "../_schemas/verify.schema"

export const useVerifyCodeForm = (channel: VerifyChannel) => {
  const verifyForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: "" },
  })

  const verifyMutation = useMutation({
    mutationFn: (data: VerifyCodeFormData) =>
      authApi.confirmVerification({ channel, code: data.code }),

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Código de verificação inválido"))
    },
  })

  const resendMutation = useMutation({
    mutationFn: () => authApi.requestVerification({ channel }),

    onSuccess: () => {
      toast.success("Código reenviado")
    },

    onError: (err: Error) => {
      toast.error(getErrorMessage(err, "Não foi possível reenviar o código"))
    },
  })

  const onVerify = (data: VerifyCodeFormData) => {
    verifyMutation.mutate(data)
  }

  const onResend = () => {
    resendMutation.mutate()
  }

  const { reset: resetForm } = verifyForm
  const { reset: resetMutation } = verifyMutation

  const reset = useCallback(() => {
    resetForm()
    resetMutation()
  }, [resetForm, resetMutation])

  return {
    verifyForm,
    onVerify,
    onResend,
    reset,
    isLoading: verifyMutation.isPending,
    isResending: resendMutation.isPending,
    isSuccess: verifyMutation.isSuccess,
  }
}
