"use client"

import { useState } from "react"
import { Controller, type Control, type FieldPath } from "react-hook-form"
import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ProductFormData } from "../_schemas/product.schema"

type SizesSectionProps = {
  control: Control<ProductFormData>
}

export function SizesSection({ control }: SizesSectionProps) {
  const [newSize, setNewSize] = useState("")

  return (
    <Controller
      name="sizes"
      control={control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-bold text-muted-foreground">
            Variações & Atributos
          </Label>
          <span className="text-sm font-medium">Tamanho</span>
          <div className="flex flex-wrap items-center gap-2">
            {field.value?.map((size) => (
              <Button
                key={size}
                variant="outline"
                size="icon-sm"
                className=" font-bold"
                onClick={() =>
                  field.onChange(
                    field.value?.filter((s) => s !== size) ?? []
                  )
                }
              >
                {size}
              </Button>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="h-9 border border-dashed border-muted-foreground/40 px-4 font-medium"
              onClick={() => {
                const trimmed = newSize.trim()
                if (trimmed && !field.value?.includes(trimmed)) {
                  field.onChange([...(field.value ?? []), trimmed])
                  setNewSize("")
                }
              }}
            >
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
          {fieldState.error && (
            <span className="text-xs text-destructive">
              {fieldState.error.message}
            </span>
          )}
        </div>
      )}
    />
  )
}
