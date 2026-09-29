import { useCallback, useEffect, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { authApi, getErrorMessage } from "@/lib/api"
import { maskPhone } from "@/lib/utils"
import { useOnboardingGuard } from "@/lib/auth/use-onboarding-guard"

import {
  verifyCodeSchema,
  type VerifyChannel,
  type VerifyCodeFormData,
} from "../_schemas/verify.schema"
import type { PersonType } from "../../register/_schemas/register.schema"

const RESEND_SECONDS = 25

const NEXT_CHANNEL: Partial<Record<VerifyChannel, VerifyChannel>> = {
  email: "phone",
}

export const useVerifyCodeForm = (type: PersonType) => {
  const router = useRouter()
  const [channel, setChannel] = useState<VerifyChannel>("email")
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const onboarding = useOnboardingGuard("verify-email")

  const verifyForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: "" },
  })

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    retry: false,
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

  const { reset: resetForm } = verifyForm
  const { reset: resetMutation, isSuccess } = verifyMutation

  const reset = useCallback(() => {
    resetForm()
    resetMutation()
  }, [resetForm, resetMutation])

  useEffect(() => {
    authApi.requestVerification({ channel }).catch(() => undefined)
  }, [channel])

  useEffect(() => {
    if (onboarding?.emailVerified && !onboarding.phoneVerified) {
      setChannel("phone")
    }
  }, [onboarding?.emailVerified, onboarding?.phoneVerified])

  useEffect(() => {
    if (seconds <= 0 || isSuccess) return
    const timer = setTimeout(() => setSeconds((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds, isSuccess])

  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => {
      const next = NEXT_CHANNEL[channel]
      if (next) {
        toast.success(
          channel === "email"
            ? "E-mail verificado com sucesso"
            : "Telefone verificado com sucesso"
        )
        setChannel(next)
        setSeconds(RESEND_SECONDS)
        reset()
      } else {
        toast.success("Telefone verificado com sucesso")
        router.push(`/auth/register/complete?type=${type}`)
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [isSuccess, channel, reset, router, type])

  const target =
    channel === "email"
      ? (user?.email ?? "…")
      : user?.phone
        ? maskPhone(user.phone)
        : "…"

  const onVerify = (data: VerifyCodeFormData) => {
    verifyMutation.mutate(data)
  }

  const onResend = () => {
    resendMutation.mutate()
    setSeconds(RESEND_SECONDS)
  }

  const onBack = () => {
    if (channel === "email") {
      router.push("/auth/register")
      return
    }
    setChannel("email")
    setSeconds(RESEND_SECONDS)
    reset()
  }

  return {
    verifyForm,
    onVerify,
    onResend,
    onBack,
    channel,
    target,
    seconds,
    canResend: seconds <= 0,
    isLoading: verifyMutation.isPending,
    isResending: resendMutation.isPending,
    isSuccess,
  }
}
