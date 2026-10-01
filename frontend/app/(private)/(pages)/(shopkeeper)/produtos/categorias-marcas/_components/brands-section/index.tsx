"use client"

import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

import { useBrands } from "../../_hooks/use-brands"
import { BrandDialog } from "./brand-dialog"

export function BrandsSection() {
  const { brands, companyId, onRemove } = useBrands()

  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Gestão de Marcas</h2>
        <BrandDialog companyId={companyId}>
          <Button variant="secondary">
            <Plus className="size-4" />
            Nova Marca
          </Button>
        </BrandDialog>
      </div>

      <ItemGroup className="gap-3">
        {brands.map((brand) => (
          <Item variant="outline" key={brand.id}>
            <ItemMedia variant="image">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon />
              )}
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{brand.name}</ItemTitle>
              <ItemDescription>{brand.slug}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <BrandDialog companyId={companyId} brand={brand}>
                <Button variant="outline" size="icon-sm" aria-label="Editar marca">
                  <Pencil className="size-4" />
                </Button>
              </BrandDialog>
              <ConfirmDeleteDialog
                description={`Excluir a marca "${brand.name}"? Os produtos vinculados ficarão sem marca.`}
                onConfirm={() => onRemove(brand.id)}
              >
                <Button
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Remover marca"
                >
                  <Trash2 className="size-4" />
                </Button>
              </ConfirmDeleteDialog>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>

      {brands.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhuma marca cadastrada ainda.
        </p>
      )}
    </div>
  )
}
