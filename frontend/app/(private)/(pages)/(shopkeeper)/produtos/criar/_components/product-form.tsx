"use client"

import { Controller } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { maskCurrency } from "@/lib/utils"

import { useProductForm } from "../_hooks/use-product-form"
import type { ProductFormData } from "../_schemas/product.schema"
import { ImagesSection } from "./images-section"
import { SizesSection } from "./sizes-section"

type ProductFormProps = {
  defaultValues?: Partial<ProductFormData>
}

export function ProductForm({ defaultValues }: ProductFormProps) {
  const {
    form,
    brands,
    categories,
    brandItems,
    categoryItems,
    onSubmit,
    onCancel,
    isSaving,
  } = useProductForm(defaultValues)
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = form

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <ImagesSection setValue={form.setValue} />

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
              name="sku"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    SKU
                  </Label>
                  <Input placeholder="Ex: ESP-001" {...field} />
                </div>
              )}
            />

            <Controller
              name="barcode"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Código de barras
                  </Label>
                  <Input placeholder="7891234567890" {...field} />
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="brandId"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Marca
                  </Label>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                    items={brandItems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Sem marca</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />

            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Categoria
                  </Label>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                    items={categoryItems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">Sem categoria</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                    onChange={(event) =>
                      field.onChange(maskCurrency(event.target.value))
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
                    Preço Promocional
                  </Label>
                  <Input
                    placeholder="0,00"
                    inputMode="decimal"
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(maskCurrency(event.target.value))
                    }
                  />
                </div>
              )}
            />

            <Controller
              name="stock"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm font-bold text-muted-foreground">
                    Estoque (un)
                  </Label>
                  <Input
                    placeholder="0"
                    inputMode="numeric"
                    value={field.value}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value.replace(/\D/g, "")
                      )
                    }
                  />
                  {errors.stock && (
                    <span className="text-xs text-destructive">
                      {errors.stock.message}
                    </span>
                  )}
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
        <Button type="button" variant="outline" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar Produto"}
        </Button>
      </div>
    </form>
  )
}
