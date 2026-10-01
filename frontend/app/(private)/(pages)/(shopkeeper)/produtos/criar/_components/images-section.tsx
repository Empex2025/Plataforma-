"use client"

import type { UseFormSetValue } from "react-hook-form"
import { Plus, X } from "lucide-react"

import { Label } from "@/components/ui/label"

import { useProductImages } from "../_hooks/use-product-images"
import type { ProductFormData } from "../_schemas/product.schema"
import { ProductImageDialog } from "./product-image-dialog"

type ImagesSectionProps = {
  setValue: UseFormSetValue<ProductFormData>
}

export function ImagesSection({ setValue }: ImagesSectionProps) {
  const images = useProductImages(setValue)

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-bold text-muted-foreground">
        Imagens do Produto
      </Label>

      <div className="flex flex-wrap gap-3">
        {images.items.map((item) => (
          <div
            key={item.id}
            className="relative size-20 overflow-hidden rounded-lg border bg-muted"
          >
            <img
              src={item.preview}
              alt="Imagem do produto"
              className="size-full object-cover"
            />
            <button
              type="button"
              onClick={() => images.remove(item.id)}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
              aria-label="Remover imagem"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {!images.maxReached && (
          <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) images.openWith(file)
                event.target.value = ""
              }}
            />
            <Plus className="size-6" />
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        A primeira imagem será a principal. Máx. 6 imagens.
      </p>

      <ProductImageDialog image={images} />
    </div>
  )
}
