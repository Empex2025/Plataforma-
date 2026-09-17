"use client"

import { Controller, type Control, type FieldPath } from "react-hook-form"
import { Plus, Upload } from "lucide-react"

import { Label } from "@/components/ui/label"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import type { ProductFormData } from "../_schemas/product.schema"

type ImagesSectionProps = {
  control: Control<ProductFormData>
}

export function ImagesSection({ control }: ImagesSectionProps) {
  return (
    <Controller
      name="mainImage"
      control={control}
      render={({ field }) => (
        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-bold text-muted-foreground">
            Imagens do Produto
          </Label>
          <AspectRatio ratio={16 / 9} className="w-full max-w-[280px]">
            <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) =>
                  field.onChange(e.target.files?.[0]?.name ?? null)
                }
              />
              <Upload className="size-8" />
              <span className="px-4 text-center text-sm">
                {typeof field.value === "string"
                  ? field.value
                  : "Upload Foto Principal"}
              </span>
            </label>
          </AspectRatio>
          <div className="mt-2 flex gap-2">
            {[0, 1, 2].map((i) => (
              <AspectRatio key={i} ratio={1} className="size-16">
                <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <Plus className="size-5" />
                </div>
              </AspectRatio>
            ))}
          </div>
        </div>
      )}
    />
  )
}
