"use client"

import { useRouter } from "next/navigation"
import { Controller, type Control, type FieldPath } from "react-hook-form"

import { cn, maskCep, maskCpf, maskDate, maskPhone } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCompleteForm } from "../_hooks/use-complete-form"
import type { CompleteFormData } from "../_schemas/complete.schema"
import type { PersonType } from "../../_schemas/register.schema"

const TITLES: Record<PersonType, string> = {
  PF: "Cadastro Pessoa Física",
  PJ: "Cadastro da Empresa",
}

const RELATIONSHIPS = [
  { value: "socio", label: "Sócio/Proprietário" },
  { value: "diretor", label: "Diretor" },
  { value: "gerente", label: "Gerente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "contador", label: "Contador" },
  { value: "outro", label: "Outro" },
]

const PF_FIELDS: FieldPath<CompleteFormData>[] = [
  "fullName",
  "birthDate",
  "zipCode",
  "address",
  "neighborhood",
  "city",
]

type TextFieldProps = {
  control: Control<CompleteFormData>
  name: FieldPath<CompleteFormData>
  label: string
  placeholder?: string
  type?: string
  autoComplete?: string
  wrapperClassName?: string
  mask?: (value: string) => string
}

function TextField({
  control,
  name,
  label,
  placeholder,
  type = "text",
  autoComplete,
  wrapperClassName,
  mask,
}: TextFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
          <Label
            htmlFor={field.name}
            className="text-sm font-bold text-muted-foreground"
          >
            {label}
          </Label>
          <Input
            {...field}
            id={field.name}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={mask ? "numeric" : undefined}
            aria-invalid={fieldState.invalid}
            className="h-11 px-3.5"
            onChange={(e) =>
              field.onChange(mask ? mask(e.target.value) : e.target.value)
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
  )
}

type SelectFieldProps = {
  control: Control<CompleteFormData>
  name: FieldPath<CompleteFormData>
  label: string
  placeholder: string
  options: { value: string; label: string }[]
  wrapperClassName?: string
}

function SelectField({
  control,
  name,
  label,
  placeholder,
  options,
  wrapperClassName,
}: SelectFieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
          <Label
            htmlFor={field.name}
            className="text-sm font-bold text-muted-foreground"
          >
            {label}
          </Label>
          <Select
            value={typeof field.value === "string" ? field.value : null}
            onValueChange={(value) => field.onChange(value ?? "")}
          >
            <SelectTrigger
              id={field.name}
              className="h-11 w-full"
              aria-invalid={fieldState.invalid}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error && (
            <p className="text-sm text-destructive">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  )
}

export function CompleteForm({
  type,
  className,
  ...props
}: React.ComponentProps<"form"> & { type: PersonType }) {
  const router = useRouter()
  const { completeForm, onComplete, isLoading } = useCompleteForm(type)
  const { control, handleSubmit, watch, setValue, trigger } = completeForm

  const isPf = type === "PF"
  const isPj = type === "PJ"
  const step = watch("step")
  const isPersonStep = isPf && step === 1
  const showRepresentative = isPf && step === 2

  async function handleNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const valid = await trigger(PF_FIELDS)
    if (valid) setValue("step", 2)
  }

  function handleBack() {
    if (isPf && step === 2) {
      setValue("step", 1)
      return
    }
    router.push(`/auth/verify?type=${type}`)
  }

  const title = showRepresentative
    ? "Representante da empresa"
    : TITLES[type]

  return (
    <form
      className={cn("flex w-full flex-col gap-8", className)}
      onSubmit={isPersonStep ? handleNext : handleSubmit(onComplete)}
      {...props}
    >
      <CardHeader className="p-0">
        <CardTitle className="text-2xl font-bold text-primary">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-0">
        {isPersonStep && (
          <>
            <TextField
              control={control}
              name="fullName"
              label="Nome completo"
              placeholder="Digite seu nome..."
              autoComplete="name"
            />
            <TextField
              control={control}
              name="birthDate"
              label="Data de nascimento"
              placeholder="DD/MM/AAAA"
              mask={maskDate}
              wrapperClassName="sm:w-1/2"
            />
            <TextField
              control={control}
              name="zipCode"
              label="CEP"
              placeholder="00000-000"
              autoComplete="postal-code"
              mask={maskCep}
              wrapperClassName="sm:w-1/2"
            />
            <TextField
              control={control}
              name="address"
              label="Endereço"
              placeholder="Nome da rua"
              autoComplete="street-address"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="neighborhood"
                label="Bairro"
                placeholder="Nome do bairro"
              />
              <TextField
                control={control}
                name="city"
                label="Cidade"
                placeholder="Nome da cidade"
                autoComplete="address-level2"
              />
            </div>
          </>
        )}

        {isPj && (
          <>
            <TextField
              control={control}
              name="corporateName"
              label="Razão social"
              placeholder="Loja da Esquina LTDA"
              autoComplete="organization"
            />
            <TextField
              control={control}
              name="tradeName"
              label="Nome fantasia"
              placeholder="Loja da Esquina"
            />
            <TextField
              control={control}
              name="cnae"
              label="CNAE/atividade"
              placeholder="4751-2/01 - Comércio varejista"
            />
            <TextField
              control={control}
              name="fullAddress"
              label="Endereço completo"
              placeholder="Rua, número, bairro, cidade - UF"
              autoComplete="street-address"
            />
          </>
        )}

        {showRepresentative && (
          <>
            <TextField
              control={control}
              name="repFullName"
              label="Nome completo"
              placeholder="Digite seu nome completo"
              autoComplete="name"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="repCpf"
                label="CPF"
                placeholder="000.000.000-00"
                mask={maskCpf}
              />
              <TextField
                control={control}
                name="repBirthDate"
                label="Data de nascimento"
                placeholder="DD/MM/AAAA"
                mask={maskDate}
              />
              <TextField
                control={control}
                name="repPhone"
                label="Telefone"
                placeholder="(00) 00000-0000"
                autoComplete="tel"
                mask={maskPhone}
              />
              <TextField
                control={control}
                name="repAddress"
                label="Endereço"
                placeholder="Rua, número, bairro"
                autoComplete="street-address"
              />
            </div>
            <TextField
              control={control}
              name="repRole"
              label="Cargo/função"
              placeholder="Ex: Diretor Financeiro"
            />
            <SelectField
              control={control}
              name="repRelationship"
              label="Qual é sua relação com a empresa?"
              placeholder="Selecione uma opção"
              options={RELATIONSHIPS}
            />
          </>
        )}

        <div className="flex items-center justify-between pt-2">
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
            {isLoading ? "Enviando..." : isPersonStep ? "Continuar" : "Confirmar"}
          </Button>
        </div>
      </CardContent>
    </form>
  )
}
