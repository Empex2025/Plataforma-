"use client"

import { useState } from "react"
import { Controller, type Control } from "react-hook-form"
import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-bold text-muted-foreground">
            Variações &amp; Atributos
          </Label>
          <span className="text-sm font-medium">Tamanho</span>

          <div className="flex flex-wrap items-center gap-2">
            {field.value?.map((size) => (
              <span
                key={size}
                className="inline-flex items-center gap-1 rounded-lg border border-input px-2.5 py-1 text-sm font-bold"
              >
                {size}
                <button
                  type="button"
                  onClick={() =>
                    field.onChange(
                      field.value?.filter((item) => item !== size) ?? []
                    )
                  }
                  aria-label={`Remover ${size}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ))}

            <Input
              value={newSize}
              onChange={(event) => setNewSize(event.target.value)}
              placeholder="Novo tamanho"
              className="h-9 w-32"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                const trimmed = newSize.trim()
                if (trimmed && !field.value?.includes(trimmed)) {
                  field.onChange([...(field.value ?? []), trimmed])
                  setNewSize("")
                }
              }}
            />

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
