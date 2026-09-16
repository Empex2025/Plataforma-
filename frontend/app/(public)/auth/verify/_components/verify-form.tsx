"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Controller } from "react-hook-form"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useVerifyCodeForm } from "../_hooks/use-verify-form"
import type { VerifyChannel } from "../_schemas/verify.schema"
import type { PersonType } from "../../register/_schemas/register.schema"

const RESEND_SECONDS = 25

const CHANNELS: Record<
  VerifyChannel,
  { title: string; target: string; targetLabel: string }
> = {
  email: {
    title: "Validação de E-mail",
    target: "contato@empresa.com.br",
    targetLabel: "e-mail cadastrado",
  },
  phone: {
    title: "Validação de Telefone",
    target: "(00) 0 0000-0000",
    targetLabel: "telefone cadastrado",
  },
}

const NEXT_CHANNEL: Partial<Record<VerifyChannel, VerifyChannel>> = {
  email: "phone",
}

export function VerifyForm({
  type,
  className,
  ...props
}: React.ComponentProps<"form"> & { type: PersonType }) {
  const router = useRouter()
  const [channel, setChannel] = useState<VerifyChannel>("email")
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const { verifyForm, onVerify, reset, isLoading, isSuccess } =
    useVerifyCodeForm()
  const { control, handleSubmit } = verifyForm
  const config = CHANNELS[channel]

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

  const canResend = seconds <= 0

  function handleBack() {
    if (channel === "email") {
      router.push("/auth/register")
      return
    }
    setChannel("email")
    setSeconds(RESEND_SECONDS)
    reset()
  }

  return (
    <form
      className={cn("flex w-full flex-col gap-8", className)}
      onSubmit={handleSubmit(onVerify)}
      {...props}
    >
      <CardHeader className="flex flex-col items-center gap-2 p-0">
        <CardTitle className="text-2xl font-bold text-primary">
          {config.title}
        </CardTitle>
        <CardDescription className="text-center">
          Enviamos um código de verificação para o {config.targetLabel}:{" "}
          <span className="font-semibold text-foreground">{config.target}</span>
          . Digite o código de 6 dígitos abaixo para confirmar.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6 p-0">
        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col items-center gap-2">
              <InputOTP
                maxLength={6}
                value={field.value}
                onChange={field.onChange}
                containerClassName="justify-center"
                aria-invalid={fieldState.invalid}
              >
                <InputOTPGroup className="gap-2">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const filled = Boolean(field.value[index])
                    return (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className={cn(
                          "size-12 rounded-lg border text-lg font-semibold transition-colors",
                          isSuccess
                            ? "border-emerald-500 text-emerald-600 data-[active=true]:border-emerald-500 data-[active=true]:ring-emerald-500/20 dark:border-emerald-400 dark:text-emerald-400 dark:data-[active=true]:border-emerald-400"
                            : cn(
                                "data-[active=true]:border-primary data-[active=true]:ring-primary/20",
                                filled && "border-primary"
                              )
                        )}
                      />
                    )
                  })}
                </InputOTPGroup>
              </InputOTP>
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <p className="text-center text-sm text-muted-foreground">
          Não recebeu o código?{" "}
          <Button
            variant="link"
            disabled={!canResend}
            onClick={() => setSeconds(RESEND_SECONDS)}
            className="p-0"
          >
            Reenviar código
          </Button>
          {!canResend && <span className="text-xs"> (aguarde {seconds}s)</span>}
        </p>

        <div className="flex w-full items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="h-11 border-primary px-6 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          >
            Voltar
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 cursor-pointer px-6 font-semibold"
          >
            {isLoading ? "Verificando..." : "Verificar"}
          </Button>
        </div>
      </CardContent>
    </form>
  )
}
