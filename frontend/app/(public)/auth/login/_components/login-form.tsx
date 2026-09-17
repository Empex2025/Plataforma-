"use client"

import { cn, maskCpfCnpj } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge, Check, Eye, EyeOff } from "lucide-react"
import { useLoginForm } from "../_hooks/use-login-form"
import type { LoginFormData } from "../_schemas/login.schema"
import { Controller, type FieldPath, type ControllerRenderProps, type ControllerFieldState } from "react-hook-form"
import Link from "next/link"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useState } from "react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [showPassword, setShowPassword] = useState(false)
  const { loginForm, onLogin, isLoading } = useLoginForm()
  const { control, handleSubmit } = loginForm

  return (
    <form
      className={cn("flex w-full flex-col gap-6", className)}
      onSubmit={handleSubmit(onLogin)}
      {...props}
    >
      <CardHeader className="flex flex-col items-center gap-1">
        <div className="relative flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-secondary/70 to-white">
          <Badge className="size-9 fill-secondary text-secondary" strokeWidth={1.5} />
          <Check className="absolute size-6 text-primary" strokeWidth={2} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <CardTitle className="text-2xl font-bold leading-8 text-primary">
            Encontra<span className="text-secondary">Ê</span>
          </CardTitle>
          <CardDescription>
            Gerencie sua loja de forma simples e rápida
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col gap-4">
        <Controller
          name="document"
          control={control}
          render={({ field, fieldState }: { field: ControllerRenderProps<LoginFormData, FieldPath<LoginFormData>>; fieldState: ControllerFieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-sm font-bold text-muted-foreground">
                CNPJ ou CPF
              </Label>
              <Input
                {...field}
                id={field.name}
                inputMode="numeric"
                placeholder="Digite aqui..."
                aria-invalid={fieldState.invalid}
                onChange={(e) => field.onChange(maskCpfCnpj(e.target.value))}
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }: { field: ControllerRenderProps<LoginFormData, FieldPath<LoginFormData>>; fieldState: ControllerFieldState }) => (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-sm font-bold text-muted-foreground">
                Senha
              </Label>
              <InputGroup className="h-10">
                <InputGroupInput
                  {...field}
                  id={field.name}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-sm"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <div className="flex justify-start">
          <Link href="#">
            <Button
              className="p-1"
              variant="link"
            >
              Esqueci minha senha
            </Button>
          </Link>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </CardContent>

      <div className="flex items-center self-center">
        <span className="text-sm text-muted-foreground">
          Não tem uma conta?
        </span>
        <Link href="/auth/register">
          <Button
            className="p-1"
            variant="link"
          >
            Cadastre sua empresa
          </Button>
        </Link>
      </div>
    </form>
  )
}
