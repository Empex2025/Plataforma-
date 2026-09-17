"use client"

import { Controller, type Control, type FieldPath } from "react-hook-form"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { StoreSetupFormData } from "../../../_schemas/store-setup.schema"

type TextFieldProps = {
  control: Control<StoreSetupFormData>
  name: FieldPath<StoreSetupFormData>
  label: string
  placeholder?: string
  autoComplete?: string
  wrapperClassName?: string
  mask?: (value: string) => string
}

export function TextField({
  control,
  name,
  label,
  placeholder,
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
            value={typeof field.value === "string" ? field.value : ""}
            id={field.name}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={mask ? "numeric" : undefined}
            aria-invalid={fieldState.invalid}
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
