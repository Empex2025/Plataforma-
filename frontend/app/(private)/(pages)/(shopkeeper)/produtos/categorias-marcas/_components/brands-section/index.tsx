"use client"

import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { BrandDialog } from "./brand-dialog"

type Brand = {
  id: string
  name: string
  productCount: number
}

const initialBrands: Brand[] = [
  { id: "1", name: "FENDI Home", productCount: 18 },
  { id: "2", name: "FENDI Home", productCount: 18 },
]

export function BrandsSection() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Gestão de Marcas</h2>
        <BrandDialog>
          <Button variant="secondary">
            <Plus className="size-4" />
            Nova Marca
          </Button>
        </BrandDialog>
      </div>
      <ItemGroup className="gap-3">
        {initialBrands.map((brand) => (
          <Item variant="outline" key={brand.id}>
            <ItemMedia variant="image">
              <ImageIcon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{brand.name}</ItemTitle>
              <ItemDescription>{brand.productCount} produtos</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="outline" size="icon-sm">
                <Pencil className="size-4" />
              </Button>
              <Button variant="destructive" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
  )
}
