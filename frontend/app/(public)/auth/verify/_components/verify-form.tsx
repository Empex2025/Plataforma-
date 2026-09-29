"use client"

import { Controller } from "react-hook-form"

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

const CHANNELS: Record<
  VerifyChannel,
  { title: string; targetLabel: string }
> = {
  email: {
    title: "Validação de E-mail",
    targetLabel: "e-mail cadastrado",
  },
  phone: {
    title: "Validação de Telefone",
    targetLabel: "telefone cadastrado",
  },
}

export function VerifyForm({
  type,
  className,
  ...props
}: React.ComponentProps<"form"> & { type: PersonType }) {
  const {
    verifyForm,
    onVerify,
    onResend,
    onBack,
    channel,
    target,
    seconds,
    canResend,
    isLoading,
    isResending,
    isSuccess,
  } = useVerifyCodeForm(type)
  const { control, handleSubmit } = verifyForm
  const config = CHANNELS[channel]

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
          <span className="font-semibold text-foreground">{target}</span>
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
                            ? "border-success text-success data-[active=true]:border-success data-[active=true]:ring-success/20"
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
            disabled={!canResend || isResending}
            onClick={onResend}
            className="p-0"
          >
            Reenviar código
          </Button>
          {!canResend && <span className="text-xs"> (aguarde {seconds}s)</span>}
        </p>

        <div className="flex w-full items-center justify-between">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            onClick={onBack}
          >
            Voltar
          </Button>

          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            className="cursor-pointer"
          >
            {isLoading ? "Verificando..." : "Verificar"}
          </Button>
        </div>
      </CardContent>
    </form>
  )
}
