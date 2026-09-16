"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import {
  Controller,
  type FieldPath,
  type ControllerRenderProps,
  type ControllerFieldState,
} from "react-hook-form"

import { cn, maskCnpj, maskCpf } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { useRegisterForm } from "../_hooks/use-register-form"
import type { RegisterFormData, PersonType } from "../_schemas/register.schema"

const personTypes: { value: PersonType; label: string }[] = [
  { value: "PF", label: "Pessoa Física (PF)" },
  { value: "PJ", label: "Pessoa Jurídica (PJ)" },
]

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [showPassword, setShowPassword] = useState(false)
  const { registerForm, onRegister, isLoading } = useRegisterForm()
  const { control, handleSubmit, watch, setValue } = registerForm
  const personType = watch("personType")

  return (
    <form
      className={cn("flex w-full flex-col gap-8", className)}
      onSubmit={handleSubmit(onRegister)}
      {...props}
    >
      <CardHeader className="p-0">
        <CardTitle className="text-2xl font-bold text-primary">
          Como vai vender?
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-0">
        <Controller
          name="personType"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-4">
              {personTypes.map(({ value, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={field.value === value ? "default" : "outline"}
                  className={cn(
                    "h-11 font-semibold",
                    field.value !== value &&
                      "border-primary text-primary hover:bg-primary/10 hover:text-primary"
                  )}
                  onClick={() => {
                    if (field.value !== value) {
                      field.onChange(value)
                      setValue("document", "")
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
        />

        <Controller
          name="document"
          control={control}
          render={({
            field,
            fieldState,
          }: {
            field: ControllerRenderProps<RegisterFormData, FieldPath<RegisterFormData>>
            fieldState: ControllerFieldState
          }) => (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-1.5">
                <Label
                  htmlFor={field.name}
                  className="text-sm font-bold text-muted-foreground"
                >
                  Informe seu {personType === "PF" ? "CPF" : "CNPJ"}
                </Label>
                <span className="text-xs text-muted-foreground">
                  (Você poderá alterar seus dados de cadastro depois).
                </span>
              </div>
              <Input
                {...field}
                id={field.name}
                inputMode="numeric"
                placeholder="Digite aqui..."
                aria-invalid={fieldState.invalid}
                className="h-11 px-3.5"
                onChange={(e) =>
                  field.onChange(
                    personType === "PF"
                      ? maskCpf(e.target.value)
                      : maskCnpj(e.target.value)
                  )
                }
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
          name="email"
          control={control}
          render={({
            field,
            fieldState,
          }: {
            field: ControllerRenderProps<RegisterFormData, FieldPath<RegisterFormData>>
            fieldState: ControllerFieldState
          }) => (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor={field.name}
                className="text-sm font-bold text-muted-foreground"
              >
                E-mail
              </Label>
              <Input
                {...field}
                id={field.name}
                type="email"
                placeholder="nome@provedor.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                className="h-11 px-3.5"
              />
              {fieldState.error && (
                <p className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="phone"
            control={control}
            render={({
              field,
              fieldState,
            }: {
              field: ControllerRenderProps<RegisterFormData, FieldPath<RegisterFormData>>
              fieldState: ControllerFieldState
            }) => (
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={field.name}
                  className="text-sm font-bold text-muted-foreground"
                >
                  Telefone de contato
                </Label>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="(00) 0 0000-0000"
                  autoComplete="tel"
                  aria-invalid={fieldState.invalid}
                  className="h-11 px-3.5"
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
            render={({
              field,
              fieldState,
            }: {
              field: ControllerRenderProps<RegisterFormData, FieldPath<RegisterFormData>>
              fieldState: ControllerFieldState
            }) => (
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={field.name}
                  className="text-sm font-bold text-muted-foreground"
                >
                  Senha
                </Label>
                <InputGroup className="h-11">
                  <InputGroupInput
                    {...field}
                    id={field.name}
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      type="button"
                      size="icon-sm"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
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
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link
            href="/auth"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 border-primary px-6 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            Cancelar
          </Link>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 cursor-pointer px-6 font-semibold"
          >
            {isLoading ? "Enviando..." : "Próximo"}
          </Button>
        </div>
      </CardContent>
    </form>
  )
}
