"use client"

import { Controller } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { maskCurrency } from "@/lib/utils"

import { useProductForm } from "../_hooks/use-product-form"
import type { ProductFormData } from "../_schemas/product.schema"
import { ImagesSection } from "./images-section"
import { SizesSection } from "./sizes-section"

type ProductFormProps = {
  defaultValues?: Partial<ProductFormData>
}

export function ProductForm({ defaultValues }: ProductFormProps) {
  const { form, onSubmit, onCancel } = useProductForm(defaultValues)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <ImagesSection control={control} />

        <div className="flex flex-col gap-4">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-bold text-muted-foreground">
                  Nome do Produto
                </Label>
                <Input
                  placeholder="Ex: Espelho Adnet Redondo 60cm"
                  {...field}
                />
                {errors.name && (
                  <span className="text-xs text-destructive">
                    {errors.name.message}
                  </span>
                )}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="brand"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Marca
                  </Label>
                  <Input placeholder="Selecione ou digite" {...field} />
                  {errors.brand && (
                    <span className="text-xs text-destructive">
                      {errors.brand.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Categoria
                  </Label>
                  <Input placeholder="Ex: Decoração" {...field} />
                  {errors.category && (
                    <span className="text-xs text-destructive">
                      {errors.category.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="salePrice"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Preço de Venda (R$)
                  </Label>
                  <Input
                    placeholder="0,00"
                    inputMode="decimal"
                    value={field.value}
                    onChange={(e) =>
                      field.onChange(maskCurrency(e.target.value))
                    }
                  />
                  {errors.salePrice && (
                    <span className="text-xs text-destructive">
                      {errors.salePrice.message}
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name="promoPrice"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Preço Promocional (Opcional)
                  </Label>
                  <Input
                    placeholder="0,00"
                    inputMode="decimal"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(maskCurrency(e.target.value))
                    }
                  />
                </div>
              )}
            />
          </div>
        </div>
      </div>

      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-bold text-muted-foreground">
              Descrição Detalhada
            </Label>
            <Textarea
              placeholder="Escreva sobre o produto, tamanho, material, cuidados necessários..."
              className="min-h-32"
              {...field}
            />
          </div>
        )}
      />

      <SizesSection control={control} />

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg">
          Salvar Produto
        </Button>
      </div>
    </form>
  )
}
